import { createClient } from "@supabase/supabase-js";

const timeout = (ms, code) => new Promise((_, reject) => setTimeout(() => reject(new Error(code)), ms));
const safe = (message) => String(message ?? "SUPABASE_AUTH_ERROR").replace(/(bearer|apikey|token|secret|password)[^\s,]*/gi, "$1=<redacted>");
const authOrigin = () => String(new Error("AUTH_CALL_ORIGIN").stack ?? "").split("\n").find((line) => line.includes("scripts/helpers") || line.includes("scripts/test_contract_signature_envelopes"))?.trim() ?? "unknown";

export async function createTestAuthUser({ env, adminClient, credentials, role }) {
  if (!credentials || typeof credentials.email !== "string" || !credentials.email.trim() || typeof credentials.password !== "string" || !credentials.password) throw new Error("TEST_AUTH_CREDENTIALS_INVALID");
  console.log(JSON.stringify({ step: "auth_call_started", method: "admin.createUser", role, emailPresent: true, phonePresent: false, passwordPresent: true, currentStep: "fixture_user_create", projectFrame: authOrigin() }));
  const result = await createFixtureUser({ env, adminClient, email: credentials.email, password: credentials.password, metadata: { role } });
  console.log(JSON.stringify({ step: "auth_call_completed", method: "admin.createUser", role, success: true, userIdPresent: Boolean(result.id) }));
  return { userId: result.id, role, credentials };
}

export async function authenticateTestUser({ env, credentials, role }) {
  if (!credentials || typeof credentials.email !== "string" || !credentials.email.trim() || typeof credentials.password !== "string" || !credentials.password) throw new Error("TEST_AUTH_CREDENTIALS_INVALID");
  console.log(JSON.stringify({ step: "auth_call_started", method: "signInWithPassword", role, emailPresent: true, phonePresent: false, passwordPresent: true, currentStep: "user_authenticate", projectFrame: authOrigin() }));
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const result = await Promise.race([client.auth.signInWithPassword({ email: credentials.email, password: credentials.password }), timeout(30000, "AUTH_LOGIN_TIMEOUT")]);
  if (result.error || !result.data.session?.access_token) throw result.error ?? new Error("AUTH_SESSION_MISSING");
  console.log(JSON.stringify({ step: "auth_call_completed", method: "signInWithPassword", role, success: true, sessionPresent: true }));
  return { client, session: result.data.session };
}

export function createAdminFixtureClient(env) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_ADMIN_CONNECTION_FAILED");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function createFixtureUser({ env, adminClient, email, password, metadata = {} }) {
  const payload = { email, password, email_confirm: true, user_metadata: metadata };
  const sdkResult = await Promise.race([adminClient.auth.admin.createUser(payload), timeout(30000, "AUTH_ADMIN_CREATE_USER_TIMEOUT")]);
  if (!sdkResult.error && sdkResult.data?.user?.id) return sdkResult.data.user;
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.id) throw new Error(`AUTH_ADMIN_CREATE_USER_FAILED:${safe(body?.msg ?? body?.message ?? sdkResult.error?.message ?? response.status)}`);
  return body;
}

export async function deleteFixtureUser({ env, adminClient, userId }) {
  const sdkResult = await Promise.race([adminClient.auth.admin.deleteUser(userId), timeout(30000, "AUTH_ADMIN_DELETE_USER_TIMEOUT")]);
  if (!sdkResult.error) return;
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`AUTH_ADMIN_DELETE_USER_FAILED:${safe(response.status)}`);
}
