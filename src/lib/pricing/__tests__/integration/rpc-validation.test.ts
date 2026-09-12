/**
 * Testes de integração — RPCs do módulo de Pricing.
 *
 * Executa contra o banco Supabase real usando usuários autenticados de teste.
 * O service_role é usado apenas para setup e cleanup de fixtures.
 *
 * Requisitos para rodar:
 *   PRICING_INTEGRATION_TESTS=true
 *   NEXT_PUBLIC_SUPABASE_URL=<url do projeto>
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
 *
 * Rodar:
 *   PRICING_INTEGRATION_TESTS=true npx vitest run --grep "integration"
 *
 * Esses testes são EXCLUÍdos da execução padrão de testes.
 * Para incluir, use: npx vitest run --grep "integration" --grep "rpc-validation"
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { computeCalculationHash } from "@/lib/pricing/idempotency";
import type { Database } from "@/lib/supabase/types";

// ── Configuração ───────────────────────────────────────────

const INTEGRATION_ENABLED =
  process.env.PRICING_INTEGRATION_TESTS === "true";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Prefixo para dados de teste (facilita identificação e limpeza)
const TEST_PREFIX = `__integration_test_${Date.now()}`;

// IDs de dados criados durante os testes (para cleanup)
const createdScenarioIds: string[] = [];
const createdVersionIds: string[] = [];
const createdEventIds: string[] = [];

// ── Helpers ────────────────────────────────────────────────

function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function signInTestUser(email: string, password: string) {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return client;
}

/** Limpa dados de teste criados durante a suíte */
async function cleanupTestData(client: SupabaseClient<Database>) {
  // Remover eventos
  if (createdEventIds.length > 0) {
    await client
      .from("pricing_scenario_events")
      .delete()
      .in("id", createdEventIds);
  }

  // Remover versões
  if (createdVersionIds.length > 0) {
    await client
      .from("pricing_scenario_versions")
      .delete()
      .in("id", createdVersionIds);
  }

  // Remover cenários
  if (createdScenarioIds.length > 0) {
    await client
      .from("pricing_scenarios")
      .delete()
      .in("id", createdScenarioIds);
  }
}

// ── Suite principal ────────────────────────────────────────

describe.skipIf(!INTEGRATION_ENABLED)(
  "RPC Validation — Pricing (integração)",
  () => {
    let anonClient: SupabaseClient<Database>;
    let adminClient: SupabaseClient<Database>;
    let ownerClient: SupabaseClient<Database>;
    let tenantAId = "";
    let ownerMemberId = "";

    beforeAll(async () => {
      anonClient = createAnonClient();
      adminClient = createAdminClient();
      ownerClient = await signInTestUser(
        "owner-a@test-pricing.example.com",
        "TestPricing2024!A",
      );

      const {
        data: { user },
      } = await ownerClient.auth.getUser();

      const { data: tenant } = await adminClient
        .from("law_firms")
        .select("id")
        .eq("slug", "tenant-a-pricing-test")
        .single();

      tenantAId = tenant?.id ?? "";

      const { data: member } = await adminClient
        .from("law_firm_members")
        .select("id")
        .eq("law_firm_id", tenantAId)
        .eq("user_id", user?.id ?? "")
        .maybeSingle();

      ownerMemberId = member?.id ?? "";

      expect(tenantAId).not.toBe("");
      expect(ownerMemberId).not.toBe("");
    });

    afterAll(async () => {
      if (INTEGRATION_ENABLED) {
        await cleanupTestData(adminClient);
      }
    });

    // ── Grupo 1: create_pricing_scenario_version ───────────

    describe("RPC create_pricing_scenario_version", () => {
      let scenarioId: string;
      let versionId = "";

      beforeAll(async () => {
        // Criar cenário de teste via insert direto (anônimo com RLS permite
        // inserção no contexto de teste configurado no Supabase)
        const { data, error } = await adminClient
          .from("pricing_scenarios")
          .insert({
            law_firm_id: tenantAId,
            created_by: ownerMemberId,
            name: `${TEST_PREFIX}_create_version`,
            status: "draft",
          })
          .select("id")
          .single();

        expect(error).toBeNull();
        scenarioId = data!.id;
        createdScenarioIds.push(scenarioId);
      });

      it("cria versão com version_number = 1", async () => {
        const parameters = {
          feeType: "fixed",
          feeValueCents: 150000,
          currency: "BRL",
          paymentMethod: "single",
          installments: 6,
        };

        const calculationResult = {
          base_fee_cents: 150000,
          total_fee_cents: 150000,
        };

        const calculationMemory = {
          steps: [{ step: "fee", description: "Cálculo fixo", value: 150000 }],
        };

        const { data, error } = await ownerClient.rpc(
          "create_pricing_scenario_version",
          {
            p_scenario_id: scenarioId,
            p_parameters: parameters as never,
            p_calculation_result: calculationResult as never,
            p_calculation_memory: calculationMemory as never,
            p_activate: false,
          },
        );

        expect(error).toBeNull();
        expect(data).toBeTruthy();

        const rpc = data as {
          ok: boolean;
          error?: string;
          version_id?: string;
          version_number?: number;
        };

        expect(rpc.ok).toBe(true);
        expect(rpc.version_number).toBe(1);
        versionId = rpc.version_id ?? "";
        createdVersionIds.push(versionId);
      });

      it("cria evento de tipo 'version_created'", async () => {
        const { data, error } = await ownerClient
          .from("pricing_scenario_events_secure")
          .select("id, event_type")
          .eq("pricing_scenario_id", scenarioId)
          .eq("event_type", "version_created")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        expect(error).toBeNull();
        const event = data as { id: string; event_type: string } | null;
        expect(event).toBeTruthy();
        expect(event!.event_type).toBe("version_created");
        createdEventIds.push(event!.id);
      });

      it("segunda chamada na RPC legada cria uma nova versão", async () => {
        const parameters = {
          feeType: "fixed",
          feeValueCents: 150000,
          currency: "BRL",
          paymentMethod: "single",
          installments: 6,
        };

        const calculationResult = {
          base_fee_cents: 150000,
          total_fee_cents: 150000,
        };

        const calculationMemory = {
          steps: [{ step: "fee", description: "Cálculo fixo", value: 150000 }],
        };

        const { data, error } = await ownerClient.rpc(
          "create_pricing_scenario_version",
          {
            p_scenario_id: scenarioId,
            p_parameters: parameters as never,
            p_calculation_result: calculationResult as never,
            p_calculation_memory: calculationMemory as never,
            p_activate: false,
          },
        );

        expect(error).toBeNull();

        const rpc = data as {
          ok: boolean;
          error?: string;
          version_id?: string;
          version_number?: number;
        };

        expect(rpc.ok).toBe(true);
        expect(rpc.version_number).toBe(2);

        // A RPC legada não é idempotente: a segunda chamada cria a versão 2.
        const { count } = await ownerClient
          .from("pricing_scenario_versions_secure")
          .select("*", { count: "exact", head: true })
          .eq("pricing_scenario_id", scenarioId);

        expect(count).toBe(2);
      });
    });

    // ── Grupo 2: set_active_pricing_version ────────────────

    describe("RPC set_active_pricing_version", () => {
      let scenarioId: string;
      let versionId = "";

      beforeAll(async () => {
        // Criar cenário
        const { data: scenario, error: scenarioError } = await adminClient
          .from("pricing_scenarios")
          .insert({
            law_firm_id: tenantAId,
            created_by: ownerMemberId,
            name: `${TEST_PREFIX}_activate_version`,
            status: "draft",
          })
          .select("id")
          .single();

        expect(scenarioError).toBeNull();
        scenarioId = scenario!.id;
        createdScenarioIds.push(scenarioId);

        // Criar versão
        const { data: versionData, error: versionError } = await ownerClient.rpc(
          "create_pricing_scenario_version",
          {
            p_scenario_id: scenarioId,
            p_parameters: {
              feeType: "fixed",
              feeValueCents: 200000,
              currency: "BRL",
              paymentMethod: "single",
              installments: 12,
            } as never,
            p_calculation_result: {
              base_fee_cents: 200000,
              total_fee_cents: 200000,
            } as never,
            p_calculation_memory: {
              steps: [],
            } as never,
            p_activate: true,
          },
        );

        expect(versionError).toBeNull();
        const rpc = versionData as {
          ok: boolean;
          version_id?: string;
        };
        expect(rpc.ok).toBe(true);
        versionId = rpc.version_id ?? "";
        createdVersionIds.push(versionId);
      });

      it("atualiza active_version_id do cenário", async () => {
        const { data, error } = await ownerClient.rpc(
          "set_active_pricing_version",
          {
            p_scenario_id: scenarioId,
            p_version_id: versionId,
          },
        );

        expect(error).toBeNull();

        const rpc = data as { ok: boolean; error?: string };
        expect(rpc.ok).toBe(true);

        // Verificar que o cenário aponta para a versão ativa
        const { data: scenario, error: fetchError } = await ownerClient
          .from("pricing_scenarios")
          .select("active_version_id")
          .eq("id", scenarioId)
          .single();

        expect(fetchError).toBeNull();
        expect(scenario!.active_version_id).toBe(versionId);
      });

      it("cria evento de tipo 'version_activated'", async () => {
        const { data, error } = await ownerClient
          .from("pricing_scenario_events_secure")
          .select("id, event_type")
          .eq("pricing_scenario_id", scenarioId)
          .eq("event_type", "version_activated")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        expect(error).toBeNull();
        const event = data as { id: string; event_type: string } | null;
        expect(event).toBeTruthy();
        expect(event!.event_type).toBe("version_activated");
        createdEventIds.push(event!.id);
      });
    });

    // ── Grupo 3: duplicate_pricing_scenario ────────────────

    describe("RPC duplicate_pricing_scenario", () => {
      let sourceScenarioId: string;
      let duplicatedScenarioId: string;

      beforeAll(async () => {
        // Criar cenário origem
        const { data: scenario, error: scenarioError } = await adminClient
          .from("pricing_scenarios")
          .insert({
            law_firm_id: tenantAId,
            created_by: ownerMemberId,
            name: `${TEST_PREFIX}_original_scenario`,
            status: "draft",
          })
          .select("id")
          .single();

        expect(scenarioError).toBeNull();
        sourceScenarioId = scenario!.id;
        createdScenarioIds.push(sourceScenarioId);

        // Criar versão no cenário origem
        const { data: versionData } = await ownerClient.rpc(
          "create_pricing_scenario_version",
          {
            p_scenario_id: sourceScenarioId,
            p_parameters: {
              feeType: "percentage",
              feeValueCents: 10,
              currency: "BRL",
              paymentMethod: "single",
              installments: 1,
            } as never,
            p_calculation_result: {
              base_fee_cents: 50000,
              total_fee_cents: 50000,
            } as never,
            p_calculation_memory: { steps: [] } as never,
            p_activate: false,
          },
        );

        const rpc = versionData as { ok: boolean; version_id?: string };
        expect(rpc.ok).toBe(true);
        createdVersionIds.push(rpc.version_id ?? "");
      });

      it("cria novo cenário com id diferente", async () => {
        const { data, error } = await ownerClient.rpc(
          "duplicate_pricing_scenario",
          {
            p_source_scenario_id: sourceScenarioId,
          },
        );

        expect(error).toBeNull();

        const rpc = data as {
          ok: boolean;
          error?: string;
          scenario_id?: string;
        };

        expect(rpc.ok).toBe(true);
        expect(rpc.scenario_id).toBeDefined();
        expect(rpc.scenario_id).not.toBe(sourceScenarioId);

        duplicatedScenarioId = rpc.scenario_id ?? "";
        createdScenarioIds.push(duplicatedScenarioId);
      });

      it("cenário duplicado inicia em draft sem versão ativa", async () => {
        const { data, error } = await ownerClient
          .from("pricing_scenarios")
          .select("status, active_version_id")
          .eq("id", duplicatedScenarioId)
          .single();

        expect(error).toBeNull();
        expect(data).toBeTruthy();
        expect(data!.status).toBe("draft");
        expect(data!.active_version_id).toBeNull();
      });

      it("cenário duplicado tem nome com sufixo '(Cópia)'", async () => {
        const { data, error } = await ownerClient
          .from("pricing_scenarios")
          .select("name")
          .eq("id", duplicatedScenarioId)
          .single();

        expect(error).toBeNull();
        expect(data!.name).toContain("(Cópia)");
      });
    });

    // ── Grupo 4: Hash canônico (puro, sem DB) ─────────────

    describe("Hash canônico — computeCalculationHash", () => {
      const baseParams = {
        serviceId: "svc-test-integration",
        feeType: "fixed",
        feeValue: 150000,
        currency: "BRL",
        paymentMethod: "single",
        installments: 6,
        engineVersion: "1.0.0",
        schemaVersion: "1",
      };

      it("dois objetos com mesmos valores mas ordem diferente de chaves produzem o mesmo hash", () => {
        const paramsA = { ...baseParams };
        const paramsB = {
          installments: 6,
          currency: "BRL",
          feeType: "fixed",
          feeValue: 150000,
          serviceId: "svc-test-integration",
          paymentMethod: "single",
          engineVersion: "1.0.0",
          schemaVersion: "1",
        };

        const hashA = computeCalculationHash(paramsA);
        const hashB = computeCalculationHash(paramsB);

        expect(hashA).toBe(hashB);
      });

      it("alterar qualquer campo altera o hash", () => {
        const hashOriginal = computeCalculationHash(baseParams);

        // Alterar feeValue
        const hashFeeValue = computeCalculationHash({
          ...baseParams,
          feeValue: 999999,
        });
        expect(hashFeeValue).not.toBe(hashOriginal);

        // Alterar installments
        const hashInstallments = computeCalculationHash({
          ...baseParams,
          installments: 12,
        });
        expect(hashInstallments).not.toBe(hashOriginal);

        // Alterar currency
        const hashCurrency = computeCalculationHash({
          ...baseParams,
          currency: "USD",
        });
        expect(hashCurrency).not.toBe(hashOriginal);

        // Alterar paymentMethod
        const hashPayment = computeCalculationHash({
          ...baseParams,
          paymentMethod: "installment",
        });
        expect(hashPayment).not.toBe(hashOriginal);

        // Alterar feeType
        const hashFeeType = computeCalculationHash({
          ...baseParams,
          feeType: "percentage",
        });
        expect(hashFeeType).not.toBe(hashOriginal);

        // Alterar serviceId
        const hashServiceId = computeCalculationHash({
          ...baseParams,
          serviceId: "svc-different",
        });
        expect(hashServiceId).not.toBe(hashOriginal);
      });
    });

    // ── Grupo 5: Optimistic locking ───────────────────────

    describe("Optimistic locking — simulação", () => {
      let scenarioId: string;
      let originalUpdatedAt: string;

      beforeAll(async () => {
        // Criar cenário para teste de locking
        const { data, error } = await adminClient
          .from("pricing_scenarios")
          .insert({
            law_firm_id: tenantAId,
            created_by: ownerMemberId,
            name: `${TEST_PREFIX}_optimistic_locking`,
            status: "draft",
          })
          .select("id, updated_at")
          .single();

        expect(error).toBeNull();
        scenarioId = data!.id;
        originalUpdatedAt = data!.updated_at;
        createdScenarioIds.push(scenarioId);
      });

      it("atualização com updated_at correto deve ter sucesso (1 linha afetada)", async () => {
        const newName = `${TEST_PREFIX}_locked_updated`;

        const { data, error } = await ownerClient
          .from("pricing_scenarios")
          .update({ name: newName })
          .eq("id", scenarioId)
          .eq("updated_at", originalUpdatedAt)
          .select("id");

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("atualização com updated_at ANTIGO deve falhar (0 linhas afetadas)", async () => {
        // Usar o valor antigo que já não é mais o atual
        const fakeOldUpdatedAt = "2000-01-01T00:00:00.000Z";

        const { data, error } = await ownerClient
          .from("pricing_scenarios")
          .update({ name: `${TEST_PREFIX}_should_not_apply` })
          .eq("id", scenarioId)
          .eq("updated_at", fakeOldUpdatedAt)
          .select("id");

        expect(error).toBeNull();
        // 0 linhas afetadas — o updated_at antigo não corresponde
        expect(data).toHaveLength(0);
      });
    });

    // ── Grupo 6: RLS — acesso não autenticado ─────────────

    describe("RLS — bloqueio de acesso não autenticado", () => {
      it("query pricing_scenarios sem autenticação retorna 0 linhas", async () => {
        // O cliente anônimo não tem sessão de autenticação.
        // Com RLS habilitado, não deve retornar dados.
        const { data, error } = await anonClient
          .from("pricing_scenarios")
          .select("id, name")
          .limit(10);

        // A query não deve retornar erro (RLS filtra silenciosamente),
        // mas deve retornar 0 linhas.
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      });

      it("query pricing_scenario_versions sem autenticação retorna 0 linhas", async () => {
        const { data, error } = await anonClient
          .from("pricing_scenario_versions")
          .select("id")
          .limit(10);

        expect(error?.code).toBe("42501");
        expect(data).toBeNull();
      });

      it("query pricing_scenario_events sem autenticação retorna 0 linhas", async () => {
        const { data, error } = await anonClient
          .from("pricing_scenario_events")
          .select("id")
          .limit(10);

        expect(error?.code).toBe("42501");
        expect(data).toBeNull();
      });
    });
  },
);
