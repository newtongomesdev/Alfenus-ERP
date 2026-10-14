import { describe, expect, it } from "vitest";

import { getCalendarDaysUntil, getSoloOverviewStatus, isNavigationItemActive, getOverviewCount, isNavigationReady } from "@/lib/solo/ux";

describe("Solo UX rules", () => {
  it("expands a navigation group when one of its children is active", () => {
    expect(isNavigationItemActive("/despesas", "/recebimentos", [{ href: "/despesas" }])).toBe(true);
    expect(isNavigationItemActive("/documentos/modelos/novo", "/documentos", [{ href: "/documentos/modelos" }])).toBe(true);
  });

  it("does not mark unrelated groups as active", () => {
    expect(isNavigationItemActive("/clientes", "/recebimentos", [{ href: "/despesas" }])).toBe(false);
  });

  it("distinguishes an unavailable dashboard from a query failure", () => {
    expect(getSoloOverviewStatus(false, 0)).toBe("unavailable");
    expect(getSoloOverviewStatus(true, 1)).toBe("error");
    expect(getSoloOverviewStatus(true, 0)).toBe("ready");
  });

  it("shows navigation after the authenticated mode lookup settles", () => {
    expect(isNavigationReady({ authenticated: true, hasServerMode: false, modeResolved: true })).toBe(true);
    expect(isNavigationReady({ authenticated: true, hasServerMode: false, modeResolved: false })).toBe(false);
    expect(isNavigationReady({ authenticated: false, hasServerMode: false, modeResolved: false })).toBe(true);
  });

  it("uses the exact database count instead of the limited list size", () => {
    expect(getOverviewCount(27, 10)).toBe(27);
    expect(getOverviewCount(null, 8)).toBe(8);
  });

  it("calculates date-only deadlines by local calendar day", () => {
    expect(getCalendarDaysUntil("2026-10-14", new Date("2026-10-14T15:00:00-03:00"))).toBe(0);
    expect(getCalendarDaysUntil("2026-10-13", new Date("2026-10-14T09:00:00-03:00"))).toBe(-1);
    expect(getCalendarDaysUntil("2026-10-15", new Date("2026-10-14T23:30:00-03:00"))).toBe(1);
  });
});
