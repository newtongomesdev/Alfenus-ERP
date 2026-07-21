import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

type OpenRouterResponse = {
  id?: string;
  usage?: OpenRouterUsage;
  choices?: Array<{ message?: { content?: unknown } }>;
  data?: Array<{ embedding?: number[] }>;
};

type UsageLogParams = {
  lawFirmId: string | null;
  actorId: string | null;
  operation: string;
  model: string;
  generationId?: string | null;
  usage?: OpenRouterUsage;
};

export type AiUsageRow = {
  law_firm_id: string | null;
  model: string;
  operation: string;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
};

type UsageInsertClient = {
  from(table: "ai_usage_logs"): {
    insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
};

type SettingsQueryClient = {
  from(table: "ai_platform_settings"): {
    select(columns: string): {
      eq(column: string, value: string): {
        single(): Promise<{ data: AiSettings | null; error: Error | null }>;
      };
    };
  };
};

type UsageQueryClient = {
  from(table: "ai_usage_logs"): {
    select(columns: string): {
      order(column: string, options: { ascending: boolean }): {
        limit(value: number): Promise<{ data: AiUsageRow[] | null; error: Error | null }>;
      };
    };
  };
};

type AiSettings = { active_model: string; embedding_model: string; enabled: boolean };

function apiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada");
  return key;
}

async function request<T extends OpenRouterResponse>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${OPENROUTER_URL}${path}`, { method: "POST", headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://www.alfenus.com", "X-Title": "Alfenus" }, body: JSON.stringify(body), cache: "no-store" });
  if (!response.ok) throw new Error(`OpenRouter respondeu ${response.status}`);
  return await response.json() as T;
}

async function getGenerationCost(generationId: string) {
  try {
    const response = await fetch(`${OPENROUTER_URL}/generation?id=${encodeURIComponent(generationId)}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: { total_cost?: number; tokens_prompt?: number; tokens_completion?: number } };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

async function recordUsage(params: UsageLogParams) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    console.error("[ai/usage] SUPABASE_SERVICE_ROLE_KEY não configurada");
    return;
  }

  const usage = params.usage ?? {};
  let cost = typeof usage.cost === "number" ? usage.cost : null;
  let promptTokens = usage.prompt_tokens ?? 0;
  let completionTokens = usage.completion_tokens ?? 0;
  let totalTokens = usage.total_tokens ?? promptTokens + completionTokens;

  if (cost === null && params.generationId) {
    const generation = await getGenerationCost(params.generationId);
    cost = typeof generation?.total_cost === "number" ? generation.total_cost : 0;
    promptTokens = generation?.tokens_prompt ?? promptTokens;
    completionTokens = generation?.tokens_completion ?? completionTokens;
    totalTokens = promptTokens + completionTokens;
  }

  const { error } = await (admin as unknown as UsageInsertClient).from("ai_usage_logs").insert({
    law_firm_id: params.lawFirmId,
    actor_id: params.actorId,
    operation: params.operation,
    model: params.model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cost_usd: cost ?? 0,
    generation_id: params.generationId ?? null,
  });

  if (error) {
    console.error("[ai/usage] falha ao registrar uso:", error.message);
  }
}

export async function getOpenRouterModels() {
  const response = await fetch(`${OPENROUTER_URL}/models?output_modalities=text`, { headers: { Authorization: `Bearer ${apiKey()}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`OpenRouter respondeu ${response.status}`);
  return (await response.json() as { data?: Array<Record<string, unknown>> }).data ?? [];
}

export async function getAiSettings() {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin indisponível");
  const { data, error } = await (admin as unknown as SettingsQueryClient).from("ai_platform_settings").select("active_model, embedding_model, enabled").eq("id", "default").single();
  if (error) throw error;
  if (!data) throw new Error("Configuração de IA não encontrada");
  return data;
}

export async function getAiUsageLogs(adminClient: SupabaseClient) {
  return (adminClient as unknown as UsageQueryClient)
    .from("ai_usage_logs")
    .select("law_firm_id, model, operation, total_tokens, cost_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
}

export async function generateWithOpenRouter(params: { model: string; system: string; prompt: string; lawFirmId: string; actorId: string; operation: string }) {
  const result = await request<OpenRouterResponse>("/chat/completions", { model: params.model, messages: [{ role: "system", content: params.system }, { role: "user", content: params.prompt }], temperature: 0.2, max_tokens: 4000 });
  await recordUsage({ lawFirmId: params.lawFirmId, actorId: params.actorId, operation: params.operation, model: params.model, usage: result.usage, generationId: result.id });
  const content = result.choices?.[0]?.message?.content;
  return { content: typeof content === "string" ? content : "", usage: result.usage ?? {} };
}

export async function embedWithOpenRouter(params: { text: string; model: string; lawFirmId: string; actorId: string; operation: string }) {
  const result = await request<OpenRouterResponse>("/embeddings", { model: params.model, input: params.text });
  await recordUsage({ lawFirmId: params.lawFirmId, actorId: params.actorId, operation: params.operation, model: params.model, usage: result.usage, generationId: result.id });
  return (result.data?.[0]?.embedding ?? []) as number[];
}
