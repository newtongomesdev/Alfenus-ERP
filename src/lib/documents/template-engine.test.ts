import { describe, expect, it } from "vitest";
import {
  extractPlaceholders,
  extractAllPlaceholders,
  resolveVariable,
  resolveWithFilters,
  renderTemplate,
  validateTemplate,
  generatePreview,
  renderBatch,
} from "./template-engine";

describe("Template engine – placeholder extraction", () => {
  it("extracts simple placeholders", () => {
    const template = "Olá {{client.name}}, seu processo é {{case.number}}.";
    const placeholders = extractPlaceholders(template);
    expect(placeholders).toEqual(["client.name", "case.number"]);
  });

  it("deduplicates placeholders", () => {
    const template = "{{client.name}} e {{client.email}}";
    expect(extractPlaceholders(template)).toEqual(["client.name", "client.email"]);
  });

  it("returns empty for template without placeholders", () => {
    expect(extractPlaceholders("Texto sem variáveis")).toHaveLength(0);
  });

  it("extracts all placeholders with filters", () => {
    const template = "{{date | format:DD/MM/YYYY}} e {{value | currency}}";
    const all = extractAllPlaceholders(template);
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe("date");
    expect(all[0].filters).toEqual(["format:DD/MM/YYYY"]);
    expect(all[1].name).toBe("value");
    expect(all[1].filters).toEqual(["currency"]);
  });
});

describe("Template engine – variable resolution", () => {
  const context = {
    name: "João",
    client: { name: "Maria", email: "maria@test.com" },
    value: 1500,
  };

  it("resolves simple variable", () => {
    expect(resolveVariable("name", context)).toBe("João");
  });

  it("resolves nested variable", () => {
    expect(resolveVariable("client.name", context)).toBe("Maria");
  });

  it("resolves flat dotted variable", () => {
    expect(resolveVariable("client.name", { "client.name": "Ana" })).toBe("Ana");
  });

  it("returns null for missing variable", () => {
    expect(resolveVariable("missing", context)).toBeNull();
  });

  it("returns null for missing nested variable", () => {
    expect(resolveVariable("client.missing", context)).toBeNull();
  });

  it("converts number to string", () => {
    expect(resolveVariable("value", context)).toBe("1500");
  });
});

describe("Template engine – filters", () => {
  const context = { name: "João", date: "2025-06-15T10:00:00Z", amount: "1500" };

  it("default filter provides fallback", () => {
    expect(resolveWithFilters("missing", ["default:N/A"], context)).toBe("N/A");
  });

  it("default filter not used when value exists", () => {
    expect(resolveWithFilters("name", ["default:N/A"], context)).toBe("João");
  });

  it("uppercase filter", () => {
    expect(resolveWithFilters("name", ["uppercase"], context)).toBe("JOÃO");
  });

  it("lowercase filter", () => {
    expect(resolveWithFilters("name", ["lowercase"], context)).toBe("joão");
  });

  it("uppercase_first filter", () => {
    expect(resolveWithFilters("name", ["uppercase_first"], context)).toBe("João");
  });

  it("format date filter", () => {
    const result = resolveWithFilters("date", ["format:DD/MM/YYYY"], context);
    expect(result).toBe("15/06/2025");
  });

  it("format date filter with YY", () => {
    const result = resolveWithFilters("date", ["format:DD/MM/YY"], context);
    expect(result).toBe("15/06/25");
  });

  it("currency filter", () => {
    const result = resolveWithFilters("amount", ["currency"], context);
    expect(result).toContain("R$");
    expect(result).toContain("1.500");
  });
});

describe("Template engine – full rendering", () => {
  const context = {
    client: { name: "Maria Santos" },
    case: { number: "0012345-67.2025.8.26.0100" },
    date: "2025-06-15T10:00:00Z",
  };

  it("renders template with multiple variables", () => {
    const template = "Ilmo(a) Sr(a). {{client.name}}, Ref: {{case.number}}";
    const result = renderTemplate(template, context);
    expect(result).toBe("Ilmo(a) Sr(a). Maria Santos, Ref: 0012345-67.2025.8.26.0100");
  });

  it("renders with filters", () => {
    const template = "Data: {{date | format:DD/MM/YYYY}}";
    const result = renderTemplate(template, context);
    expect(result).toBe("Data: 15/06/2025");
  });

  it("renders missing variables as empty string", () => {
    const template = "Valor: {{missing}}";
    const result = renderTemplate(template, context);
    expect(result).toBe("Valor: ");
  });

  it("renders with default filter", () => {
    const template = "Obs: {{obs | default:Sem observações}}";
    const result = renderTemplate(template, context);
    expect(result).toBe("Obs: Sem observações");
  });
});

describe("Template engine – validation", () => {
  const context = { name: "João", email: "joao@test.com" };

  it("validates when all required variables are present", () => {
    const template = "Olá {{name}}, {{email}}";
    const result = validateTemplate(template, ["name", "email"], context);
    expect(result.valid).toBe(true);
    expect(result.missingRequired).toHaveLength(0);
  });

  it("detects missing required variables", () => {
    const template = "Olá {{name}}, {{phone}}";
    const result = validateTemplate(template, ["name", "phone", "address"], context);
    expect(result.valid).toBe(false);
    expect(result.missingRequired).toContain("phone");
    expect(result.missingRequired).toContain("address");
  });

  it("lists available variables", () => {
    const template = "Olá {{name}}, {{email}}";
    const result = validateTemplate(template, [], context);
    expect(result.available).toContain("name");
    expect(result.available).toContain("email");
  });
});

describe("Template engine – preview", () => {
  it("returns full content when short", () => {
    const template = "Olá {{name}}";
    const result = generatePreview(template, { name: "João" });
    expect(result).toBe("Olá João");
  });

  it("truncates long content", () => {
    const template = "x".repeat(1000);
    const result = generatePreview(template, {}, 100);
    expect(result).toHaveLength(103); // 100 + "..."
    expect(result.endsWith("...")).toBe(true);
  });
});

describe("Template engine – batch rendering", () => {
  const context = { client: { name: "Maria" }, case: { number: "001" } };

  it("renders multiple templates", () => {
    const templates = [
      "Cliente: {{client.name}}",
      "Processo: {{case.number}}",
    ];
    const results = renderBatch(templates, context);
    expect(results).toHaveLength(2);
    expect(results[0].content).toBe("Cliente: Maria");
    expect(results[1].content).toBe("Processo: 001");
  });

  it("counts unresolved variables", () => {
    const templates = ["Olá {{missing}}"];
    const results = renderBatch(templates, context);
    expect(results[0].unresolvedCount).toBe(1);
  });
});

describe("Template engine – real-world legal document", () => {
  it("renders a full legal letter template", () => {
    const template = `
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA

{{client.name | uppercase}}, portador do CPF {{client.document | default:não informado}},
vem, respeitosamente, à presença de Vossa Excelência, propor

AÇÃO DE {{case.actionType | uppercase}} em face de {{case.opposingParty | default:desconhecido}},
pelos fatos e fundamentos a seguir expostos.

Data: {{date | format:DD/MM/YYYY}}
    `.trim();

    const context = {
      client: { name: "João da Silva", document: "123.456.789-00" },
      case: { actionType: "Indenização", opposingParty: "Empresa XYZ Ltda" },
      date: "2025-06-15T10:00:00Z",
    };

    const result = renderTemplate(template, context);
    expect(result).toContain("JOÃO DA SILVA");
    expect(result).toContain("123.456.789-00");
    expect(result).toContain("INDENIZAÇÃO");
    expect(result).toContain("Empresa XYZ Ltda");
    expect(result).toContain("15/06/2025");
  });
});
