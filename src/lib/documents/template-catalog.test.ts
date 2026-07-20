import { describe, expect, it } from "vitest";

import { normalizedTemplateName, withoutDuplicateSystemTemplates } from "./template-catalog";

describe("template catalog", () => {
  it("normalizes copied template names", () => {
    expect(normalizedTemplateName("Procuração - cópia")).toBe("procuracao");
  });

  it("keeps an office copy and hides the matching system starter", () => {
    const templates = withoutDuplicateSystemTemplates([
      { id: "system", name: "Procuracao Ad Judicia e Extra", isSystem: true },
      { id: "office", name: "Procuração - cópia", isSystem: false },
      { id: "other", name: "Relatorio", isSystem: true },
    ]);

    expect(templates.map((template) => template.id)).toEqual(["office", "other"]);
  });
});
