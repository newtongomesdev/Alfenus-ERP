import { describe, expect, it } from "vitest";

import { getSoloOverviewStatus, isNavigationItemActive } from "@/lib/solo/ux";

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
});
