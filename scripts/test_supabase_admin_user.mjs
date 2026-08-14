import crypto from "node:crypto";
import { readProjectEnv } from "./proposals-test-environment.mjs";
import { createAdminFixtureClient, createFixtureUser, deleteFixtureUser } from "./helpers/alfenus-test-fixtures.mjs";

const env = readProjectEnv();
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
let userId;
async function main() {
  if (ref !== "lmfjntuofpdjojcuybkl") throw new Error("SUPABASE_PROJECT_REF_INVALID");
  const adminClient = createAdminFixtureClient(env);
  const ping = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (ping.error) throw new Error("SUPABASE_ADMIN_CONNECTION_FAILED");
  const email = `admin-fixture-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.invalid`;
  const user = await createFixtureUser({ env, adminClient, email, password: `P!${crypto.randomBytes(18).toString("base64url")}9a`, metadata: { name: "Fixture user" } });
  userId = user.id;
  await deleteFixtureUser({ env, adminClient, userId });
  const verified = await adminClient.auth.admin.getUserById(userId);
  if (!verified.error) throw new Error("AUTH_ADMIN_DELETE_USER_NOT_CONFIRMED");
  return { userCreated: true, userDeleted: true };
}
main().then((result) => process.stdout.write(`${JSON.stringify({ passed: true, ...result })}\n`)).catch((error) => { process.stderr.write(`${JSON.stringify({ passed: false, error: String(error.message ?? error) })}\n`); process.exitCode = 1; });
