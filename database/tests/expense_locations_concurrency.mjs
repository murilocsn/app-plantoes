// Only the disposable loopback cluster used by expense_locations.sql is allowed.
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { normalize, resolve } from "node:path";
import { promisify } from "node:util";

const psql = process.env.EXPENSE_TEST_PSQL || "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const args = [
  "-X",
  "-h",
  "127.0.0.1",
  "-p",
  "55428",
  "-U",
  "expense_reform_test",
  "-d",
  "postgres",
  "-qAt",
  "-v",
  "ON_ERROR_STOP=1",
  "-v",
  "VERBOSITY=sqlstate",
];
const sql = (command) =>
  execFileSync(psql, [...args, "-c", command], { encoding: "utf8", windowsHide: true }).trim();
const directory = Buffer.from(
  sql("select encode(pg_catalog.textsend(current_setting('data_directory')),'hex')"),
  "hex",
);
const expected = normalize(
  resolve("node_modules/.cache/expense-reform/postgres/data"),
).toLowerCase();
assert.ok(
  ["utf8", "latin1"].some(
    (encoding) => normalize(directory.toString(encoding)).toLowerCase() === expected,
  ),
  "Refusing a database outside the disposable test cluster",
);
const owner = "50000000-0000-4000-8000-000000000001";
const guest = "50000000-0000-4000-8000-000000000002";
const asUser = (id, command) =>
  `set role authenticated; set request.jwt.claim.sub='${id}'; ${command}`;
const parallel = (command) =>
  promisify(execFile)(psql, [...args, "-c", command], { encoding: "utf8", windowsHide: true });
sql(
  `insert into auth.users(id,email,email_confirmed_at) values('${owner}','race-location-owner@example.test',now()),('${guest}','race-location-guest@example.test',now())`,
);
try {
  const card = sql(
    asUser(owner, "select public.expense_location_create('Race location','shared')"),
  );
  assert.match(card, /^[a-f0-9-]{36}$/);
  const duplicates = await Promise.allSettled([
    parallel(
      asUser(
        owner,
        `select public.expense_location_invite('${card}','race-location-guest@example.test')`,
      ),
    ),
    parallel(
      asUser(
        owner,
        `select public.expense_location_invite('${card}','race-location-guest@example.test')`,
      ),
    ),
  ]);
  assert.equal(
    duplicates.filter((result) => result.status === "fulfilled").length,
    1,
    "Concurrent duplicate invitations must not both succeed",
  );
  const duplicateFailure = duplicates.find((result) => result.status === "rejected");
  assert.match(
    duplicateFailure.reason.stderr,
    /23505/,
    "The duplicate must fail specifically with a unique violation",
  );
  const invitation = sql(
    `select id from public.shared_expense_invitations where card_id='${card}'`,
  );
  await Promise.all([
    parallel(
      `begin; ${asUser(owner, `select public.expense_location_add_shared('${card}','Concurrent expense',100.01,'2026-10-18'); select pg_sleep(0.1);`)} commit;`,
    ),
    parallel(asUser(guest, `select public.expense_sharing_respond('${invitation}','accepted')`)),
  ]);
  const split = JSON.parse(
    sql(`select expense_split from public.shared_expense_cards where location_card_id='${card}'`),
  );
  assert.equal(
    Object.values(split).reduce((sum, amount) => sum + Math.round(Number(amount) * 100), 0),
    10001,
    "Concurrent acceptance never loses or duplicates cents",
  );
  assert.ok(
    [10001, 5001].includes(Math.round(split[owner] * 100)),
    "Split reflects exactly one serialized membership state",
  );
  const next = sql(
    asUser(
      guest,
      `select public.expense_location_add_shared('${card}','After acceptance',10.01,'2026-10-19')`,
    ),
  );
  assert.equal(
    sql(
      `select (expense_split->>'${guest}')::numeric=5 from public.shared_expense_cards where id='${next}'`,
    ),
    "t",
    "The next expense includes the accepted member",
  );
  assert.deepEqual(
    JSON.parse(
      sql(
        `select expense_split from public.shared_expense_cards where location_card_id='${card}' and description='Concurrent expense'`,
      ),
    ),
    split,
    "Creating later expenses never changes a recorded split",
  );
  console.log("Concurrent duplicate invitations and acceptance/expense creation passed.");
} finally {
  // Remove only the two synthetic users and their cascading test cards/invitations.
  // Self-referencing cards must be removed together before deleting their test owner.
  sql(
    `delete from public.shared_expense_cards where owner_id='${owner}'; delete from auth.users where id in ('${owner}','${guest}')`,
  );
}
