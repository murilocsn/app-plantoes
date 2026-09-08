import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ["apps/api/.env", ".env"], quiet: true });

const required = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "E2E_USER_1_EMAIL",
  "E2E_USER_1_PASSWORD",
];

for (const name of required) {
  assert.ok(process.env[name], `Configure ${name} para executar o teste.`);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.E2E_USER_1_EMAIL,
  password: process.env.E2E_USER_1_PASSWORD,
});
assert.equal(authError, null, "O login do usuario de teste deve funcionar.");
assert.ok(auth.session);

const baseUrl = `http://localhost:${process.env.API_PORT || 3333}/api`;
const locationName = `E2E cadastro local ${randomUUID()}`;

async function request(path, method = "GET", body, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, `${method} ${path}: ${payload.error?.code || response.status}`);
  return payload.data;
}

try {
  const input = {
    name: locationName,
    value12: 1500.5,
    doc: "",
    active: true,
    reference_start_day: 5,
    reference_end_day: 25,
    payment_due_day: 15,
    payment_due_months_after: 2,
  };
  const created = await request("/locations", "POST", input, 201);
  assert.ok(created.id);
  assert.equal(created.doc, null);
  assert.equal(Number(created.value12), input.value12);

  for (const field of [
    "reference_start_day",
    "reference_end_day",
    "payment_due_day",
    "payment_due_months_after",
  ]) {
    assert.equal(created[field], input[field]);
  }

  const updated = await request(`/locations/${created.id}`, "PATCH", { payment_due_day: 20 });
  assert.equal(updated.payment_due_day, 20);
  assert.equal(updated.reference_start_day, 5);
  assert.equal(updated.payment_due_months_after, 2);

  const locations = await request("/locations");
  assert.ok(locations.some((location) => location.id === created.id));
  const bootstrap = await request("/dashboard/bootstrap");
  assert.ok(bootstrap.locations.some((location) => location.id === created.id));
  console.log("PASS: cadastro, edicao, listagem e bootstrap de locais.");
} finally {
  // Remove somente o registro com o identificador exclusivo desta execucao.
  const { error, data } = await supabase
    .from("locations")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("name", locationName)
    .select("id");
  assert.equal(error, null, "A limpeza do registro de teste deve funcionar.");
  assert.ok(data.length <= 1, "A limpeza deve afetar apenas o registro de teste.");

  const { error: remainingError, count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("name", locationName);
  assert.equal(remainingError, null);
  assert.equal(count, 0, "O registro de teste deve ter sido removido.");
  console.log("PASS: registro de teste removido.");
}
