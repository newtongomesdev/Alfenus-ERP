import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

type OpenRouterUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number };

function apiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada");
  return key;
}

async function request(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${OPENROUTER_URL}${path}`, { method: "POST", headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://www.alfenus.com", "X-Title": "Alfenus" }, body: JSON.stringify(body), cache: "no-store" });
  if (!response.ok) throw new Error(`OpenRouter respondeu ${response.status}`);
  return response.json();
}

export async function getOpenRouterModels() {
  const response = await fetch(`${OPENROUTER_URL}/models?output_modalities=text`, { headers: { Authorization: `Bearer ${apiKey()}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`OpenRouter respondeu ${response.status}`);
  return (await response.json() as { data?: Array<Record<string, unknown>> }).data ?? [];
}

export async function getAiSettings() {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin indisponível");
  const { data, error } = await (admin as any).from("ai_platform_settings").select("active_model, embedding_model, enabled").eq("id", "default").single();
  if (error) throw error;
  return data as { active_model: string; embedding_model: string; enabled: boolean };
}

export async function generateWithOpenRouter(params: { model: string; system: string; prompt: string; lawFirmId: string; actorId: string; operation: string }) {
  const result = await request("/chat/completions", { model: params.model, messages: [{ role: "system", content: params.system }, { role: "user", content: params.prompt }], temperature: 0.2, max_tokens: 1800 });
  const usage = (result.usage ?? {}) as OpenRouterUsage;
  const admin = getSupabaseAdminClient();
  if (admin) await (admin as any).from("ai_usage_logs").insert({ law_firm_id: params.lawFirmId, actor_id: params.actorId, operation: params.operation, model: params.model, prompt_tokens: usage.prompt_tokens ?? 0, completion_tokens: usage.completion_tokens ?? 0, total_tokens: usage.total_tokens ?? 0, cost_usd: usage.cost ?? 0, generation_id: result.id ?? null });
  const content = result.choices?.[0]?.message?.content;
  return { content: typeof content === "string" ? content : "", usage };
}

export async function embedWithOpenRouter(text: string, model: string) {
  const result = await request("/embeddings", { model, input: text });
  return (result.data?.[0]?.embedding ?? []) as number[];
}
