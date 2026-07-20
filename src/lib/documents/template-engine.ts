/**
 * Template engine for document variable substitution.
 *
 * Pure logic — no database access. Handles:
 * - Variable placeholder detection ({{variable}})
 * - Nested property access ({{client.name}})
 * - Default values ({{variable | default}})
 * - Date formatting ({{date | format:DD/MM/YYYY}})
 * - Currency formatting ({{value | currency}})
 * - Validation of required variables
 * - Preview generation
 */

export interface TemplateVariable {
  name: string;
  value: string | null;
  required: boolean;
  defaultValue?: string;
}

export interface TemplateValidation {
  valid: boolean;
  missingRequired: string[];
  available: string[];
}

export interface TemplateContext {
  [key: string]: string | number | null | undefined | TemplateContext;
}

// ---------------------------------------------------------------------------
// Placeholder extraction
// ---------------------------------------------------------------------------

const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

export function extractPlaceholders(template: string): string[] {
  const placeholders: string[] = [];
  let match;

  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    const raw = match[1].trim();
    const name = raw.split("|")[0].trim();
    if (!placeholders.includes(name)) {
      placeholders.push(name);
    }
  }

  return placeholders;
}

export function extractAllPlaceholders(template: string): Array<{ full: string; name: string; filters: string[] }> {
  const results: Array<{ full: string; name: string; filters: string[] }> = [];
  let match;

  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    const raw = match[1].trim();
    const parts = raw.split("|").map((p) => p.trim());
    const name = parts[0].trim();
    const filters = parts.slice(1);
    results.push({ full: match[0], name, filters });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Variable resolution
// ---------------------------------------------------------------------------

export function resolveVariable(
  path: string,
  context: TemplateContext,
): string | null {
  const direct = context[path];
  if (direct !== null && direct !== undefined && typeof direct !== "object") {
    return String(direct);
  }

  const keys = path.split(".");
  let current: unknown = context;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return null;
    }
    current = (current as TemplateContext)[key];
  }

  if (current === null || current === undefined) return null;
  return String(current);
}

export function resolveWithFilters(
  name: string,
  filters: string[],
  context: TemplateContext,
): string {
  let value = resolveVariable(name, context);

  for (const filter of filters) {
    const [filterName, ...filterArgs] = filter.split(":").map((s) => s.trim());

    switch (filterName) {
      case "default":
        if (!value || value.trim() === "") {
          value = filterArgs.join(":") || "";
        }
        break;
      case "format":
        if (value && filterArgs.length > 0) {
          value = formatDate(value, filterArgs[0]);
        }
        break;
      case "currency":
        if (value) {
          value = formatCurrency(value);
        }
        break;
      case "uppercase":
        if (value) value = value.toUpperCase();
        break;
      case "lowercase":
        if (value) value = value.toLowerCase();
        break;
      case "uppercase_first":
        if (value) value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        break;
    }
  }

  return value || "";
}

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(PLACEHOLDER_REGEX, (_match, raw: string) => {
    const parts = raw.trim().split("|").map((p: string) => p.trim());
    const name = parts[0];
    const filters = parts.slice(1);
    return resolveWithFilters(name, filters, context);
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateTemplate(
  template: string,
  requiredVariables: string[],
  context: TemplateContext,
): TemplateValidation {
  const available = extractPlaceholders(template);
  const missingRequired = requiredVariables.filter(
    (v) => !context[v] && context[v] !== 0 && context[v] !== "",
  );

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    available,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string, format: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const fullYear = year;
  const shortYear = year.slice(-2);

  return format
    .replace("DD", day)
    .replace("MM", month)
    .replace("YYYY", fullYear)
    .replace("YY", shortYear);
}

function formatCurrency(valueStr: string): string {
  const num = parseFloat(valueStr.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(num)) return valueStr;

  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ---------------------------------------------------------------------------
// Batch rendering
// ---------------------------------------------------------------------------

export interface RenderResult {
  content: string;
  variables: Record<string, string>;
  unresolvedCount: number;
}

export function renderBatch(
  templates: string[],
  context: TemplateContext,
): RenderResult[] {
  return templates.map((template) => {
    const content = renderTemplate(template, context);
    const allPlaceholders = extractAllPlaceholders(template);
    const variables: Record<string, string> = {};
    let unresolvedCount = 0;

    for (const ph of allPlaceholders) {
      const value = resolveWithFilters(ph.name, ph.filters, context);
      variables[ph.full] = value;
      if (!value) unresolvedCount++;
    }

    return { content, variables, unresolvedCount };
  });
}

// ---------------------------------------------------------------------------
// Preview generation
// ---------------------------------------------------------------------------

export function generatePreview(
  template: string,
  context: TemplateContext,
  maxLength = 500,
): string {
  const rendered = renderTemplate(template, context);
  if (rendered.length <= maxLength) return rendered;
  return rendered.slice(0, maxLength) + "...";
}
