// Uses the isolated cluster created for this task. Refuses any other data directory.
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { resolve, normalize } from "node:path";
import assert from "node:assert/strict";

const psql = process.env.EXPENSE_TEST_PSQL || "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const args = ["-h", "127.0.0.1", "-p", "55426", "-U", "expense_test_admin", "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate"];
const sql = command => execFileSync(psql, [...args, "-c", command], { encoding: "utf8", windowsHide: true }).trim();
// Windows PostgreSQL can store the process path in its native ANSI encoding,
// even when the test database uses UTF-8. Compare exact paths in either encoding.
const directoryBytes = Buffer.from(sql("select encode(pg_catalog.textsend(current_setting('data_directory')),'hex')"), "hex");
const expectedDirectory = normalize(resolve("node_modules/.cache/financ-validation/expense-sharing-postgres/data")).toLowerCase();
assert.ok(["utf8", "latin1"].some(encoding => normalize(directoryBytes.toString(encoding)).toLowerCase() === expectedDirectory), "Refusing a database outside the isolated test cluster");
const owner = "30000000-0000-4000-8000-000000000001";
const guest = "30000000-0000-4000-8000-000000000002";
const other = "30000000-0000-4000-8000-000000000003";
const asUser = (user, command) => `set role authenticated; set request.jwt.claim.sub='${user}'; ${command}`;
const parallel = command => promisify(execFile)(psql, [...args, "-c", command], { encoding: "utf8", windowsHide: true });
sql(`insert into auth.users(id,email,email_confirmed_at) values('${owner}','concurrent-owner@example.test',now()),('${guest}','concurrent-guest@example.test',now()),('${other}','concurrent-other@example.test',now())`);
try {
  const card = sql(asUser(owner, "select public.expense_sharing_create('Concurrent expense',200,'2026-10-15')"));
  assert.match(card, /^[a-f0-9-]{36}$/);
  const outcomes = await Promise.allSettled([
    parallel(`begin; ${asUser(owner, `select public.expense_sharing_invite('${card}','concurrent-guest@example.test',150); select pg_sleep(0.25);`)} commit;`),
    parallel(asUser(owner, `select public.expense_sharing_invite('${card}','concurrent-other@example.test',150)`)),
  ]);
  assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1, "Only one competing reservation may succeed");
  assert.equal(sql(`select count(*)||':'||sum(amount) from public.shared_expense_invitations where card_id='${card}' and status='pending'`), "1:150.00");
  const invitation = sql(`select id||':'||invited_user_id from public.shared_expense_invitations where card_id='${card}'`);
  const [invitationId, recipientId] = invitation.split(":");
  const race = await Promise.allSettled([
    parallel(asUser(recipientId, `select public.expense_sharing_respond('${invitationId}','accepted')`)),
    parallel(asUser(owner, `select public.expense_sharing_cancel('${invitationId}')`)),
  ]);
  assert.equal(race.filter(outcome => outcome.status === "fulfilled").length, 1, "Accept and cancel must not both succeed");
  assert.match(sql(`select status from public.shared_expense_invitations where id='${invitationId}'`), /^(accepted|cancelled)$/);
  assert.equal(sql(asUser(owner, "select (public.expense_sharing_snapshot()->'cards'->0->>'amount')::numeric >= 0")), "t");
  console.log("Concurrent reservations and accept/cancel race passed.");
} finally {
  sql(`delete from auth.users where id in ('${owner}','${guest}','${other}')`);
}
