import { describe, it, expect } from "vitest";
import {
  PRICING_STATUS_CONFIG,
  PRICING_TYPE_CONFIG,
  PRICING_ITEM_TYPE_CONFIG,
  PRICING_EVENT_TYPE_CONFIG,
  PRICING_PERMISSIONS,
  PRICING_ROLE_PERMISSIONS,
  PRICING_LIMITS,
} from "../constants";
import type {
  PricingScenarioStatus,
  PricingScenarioType,
  PricingItemType,
  PricingEventType,
} from "../types";

describe("pricing/constants", () => {
  it("PRICING_STATUS_CONFIG tem 4 status", () => {
    const keys = Object.keys(PRICING_STATUS_CONFIG);
    expect(keys).toHaveLength(4);
    expect(keys).toContain("draft");
    expect(keys).toContain("saved");
    expect(keys).toContain("archived");
    expect(keys).toContain("converted_to_proposal");
  });

  it("PRICING_TYPE_CONFIG tem 4 tipos", () => {
    const keys = Object.keys(PRICING_TYPE_CONFIG);
    expect(keys).toHaveLength(4);
    expect(PRICING_TYPE_CONFIG.main.multiplier).toBe(1.0);
    expect(PRICING_TYPE_CONFIG.conservative.multiplier).toBe(0.8);
    expect(PRICING_TYPE_CONFIG.expanded.multiplier).toBe(1.25);
  });

  it("PRICING_ITEM_TYPE_CONFIG tem 12 itens", () => {
    expect(PRICING_ITEM_TYPE_CONFIG).toHaveLength(12);
  });

  it("PRICING_EVENT_TYPE_CONFIG tem 14 eventos", () => {
    expect(PRICING_EVENT_TYPE_CONFIG).toHaveLength(14);
  });

  it("PRICING_PERMISSIONS tem 12 permissões", () => {
    const keys = Object.keys(PRICING_PERMISSIONS);
    expect(keys).toHaveLength(12);
  });

  it("PRICING_ROLE_PERMISSIONS tem 4 papéis", () => {
    const keys = Object.keys(PRICING_ROLE_PERMISSIONS);
    expect(keys).toContain("proprietario");
    expect(keys).toContain("advogado");
    expect(keys).toContain("assistente");
    expect(keys).toContain("financeiro");
  });

  it("proprietario tem todas as permissões", () => {
    expect(PRICING_ROLE_PERMISSIONS.proprietario).toHaveLength(12);
  });

  it("assistente tem permissões limitadas", () => {
    expect(PRICING_ROLE_PERMISSIONS.assistente).toHaveLength(2);
    expect(PRICING_ROLE_PERMISSIONS.assistente).toContain(
      PRICING_PERMISSIONS.USE_SIMULATOR
    );
    expect(PRICING_ROLE_PERMISSIONS.assistente).toContain(
      PRICING_PERMISSIONS.VIEW_SCENARIOS
    );
    expect(PRICING_ROLE_PERMISSIONS.assistente).not.toContain(
      PRICING_PERMISSIONS.VIEW_INTERNAL_COSTS
    );
  });

  it("PRICING_LIMITS está definido", () => {
    expect(PRICING_LIMITS.MAX_NAME_LENGTH).toBe(500);
    expect(PRICING_LIMITS.MAX_BPS).toBe(10000);
    expect(PRICING_LIMITS.MIN_VERSION_NUMBER).toBe(1);
  });
});

describe("pricing/types — Type compatibility", () => {
  it("tipos de enum são compatíveis com constantes", () => {
    const status: PricingScenarioStatus = "draft";
    expect(PRICING_STATUS_CONFIG[status]).toBeDefined();

    const type: PricingScenarioType = "main";
    expect(PRICING_TYPE_CONFIG[type]).toBeDefined();
  });

  it("todos os pricing_item_type existem nas constantes", () => {
    const items: PricingItemType[] = [
      "work_hours", "direct_expense", "indirect_expense",
      "third_party_cost", "travel", "hearing",
      "activity", "fee", "tax",
      "adjustment", "discount", "other",
    ];
    const configValues = PRICING_ITEM_TYPE_CONFIG.map((c) => c.value);
    for (const item of items) {
      expect(configValues).toContain(item);
    }
  });

  it("todos os pricing_event_type existem nas constantes", () => {
    const events: PricingEventType[] = [
      "scenario_created", "scenario_updated", "scenario_duplicated",
      "scenario_archived", "scenario_restored", "version_created",
      "version_activated", "comparison_generated", "memory_viewed",
      "memory_printed", "memory_exported", "conversion_started",
      "conversion_completed", "conversion_failed",
    ];
    const configValues = PRICING_EVENT_TYPE_CONFIG.map((c) => c.value);
    for (const event of events) {
      expect(configValues).toContain(event);
    }
  });
});
