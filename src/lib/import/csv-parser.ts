/**
 * CSV parser for importing clients and leads.
 *
 * Pure logic — no database access. Handles:
 * - CSV line parsing with quoted field support
 * - Column mapping (header → field)
 * - Data validation per row
 * - Duplicate detection during import
 * - Progress tracking
 */

export type EntityType = "client" | "lead";

export interface CsvColumnMapping {
  csvColumn: string;
  targetField: string;
}

export interface CsvRow {
  lineNumber: number;
  raw: string;
  values: string[];
}

export interface ParsedRow {
  lineNumber: number;
  data: Record<string, string>;
  errors: string[];
}

export interface ImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: Array<{ lineNumber: number; message: string }>;
  preview: Array<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

export function parseCsvLine(line: string, delimiter = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

export function parseCsvContent(content: string, delimiter = ","): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  return lines.map((line, index) => ({
    lineNumber: index + 1,
    raw: line,
    values: parseCsvLine(line, delimiter),
  }));
}

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS: Record<EntityType, string[]> = {
  client: ["name"],
  lead: ["name"],
};

const VALID_FIELDS: Record<EntityType, string[]> = {
  client: [
    "name",
    "personType",
    "document",
    "email",
    "phone",
    "whatsapp",
    "address",
    "city",
    "state",
    "notes",
    "tags",
    "interestArea",
    "source",
  ],
  lead: [
    "name",
    "email",
    "phone",
    "whatsapp",
    "interest",
    "source",
    "notes",
  ],
};

export function mapRowToFields(
  values: string[],
  headers: string[],
  mapping: CsvColumnMapping[],
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const m of mapping) {
    const headerIndex = headers.indexOf(m.csvColumn);
    if (headerIndex >= 0 && headerIndex < values.length) {
      result[m.targetField] = values[headerIndex];
    }
  }

  return result;
}

export function validateRow(
  data: Record<string, string>,
  entityType: EntityType,
): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS[entityType]) {
    if (!data[field] || data[field].trim().length === 0) {
      errors.push(`Campo obrigatório '${field}' está vazio`);
    }
  }

  // Validate personType if present
  if (data.personType && !["fisica", "juridica"].includes(data.personType)) {
    errors.push(`Tipo de pessoa inválido: '${data.personType}' (use 'fisica' ou 'juridica')`);
  }

  // Validate email format if present
  if (data.email && data.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push(`Email inválido: '${data.email}'`);
    }
  }

  // Validate document format if present (basic length check)
  if (data.document && data.document.trim().length > 0) {
    const doc = data.document.replace(/[.\-\/\s]/g, "");
    if (doc.length < 8 || doc.length > 18) {
      errors.push(`Documento inválido: '${data.document}'`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

export function findDuplicates(
  rows: Array<Record<string, string>>,
  existingRecords: Array<{ name: string; document?: string | null; email?: string | null }>,
): Set<number> {
  const duplicateIndices = new Set<number>();
  const seenNames = new Set<string>(existingRecords.map((r) => normalizeName(r.name)));
  const seenDocuments = new Set<string>(
    existingRecords
      .filter((r) => r.document)
      .map((r) => normalizeDocument(r.document!)),
  );
  const seenEmails = new Set<string>(
    existingRecords
      .filter((r) => r.email)
      .map((r) => r.email!.toLowerCase().trim()),
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = normalizeName(row.name || "");
    const doc = row.document ? normalizeDocument(row.document) : null;
    const email = row.email ? row.email.toLowerCase().trim() : null;

    if (seenNames.has(name)) {
      duplicateIndices.add(i);
      continue;
    }
    if (doc && seenDocuments.has(doc)) {
      duplicateIndices.add(i);
      continue;
    }
    if (email && seenEmails.has(email)) {
      duplicateIndices.add(i);
      continue;
    }

    // Track for intra-file duplicates
    seenNames.add(name);
    if (doc) seenDocuments.add(doc);
    if (email) seenEmails.add(email);
  }

  return duplicateIndices;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDocument(doc: string): string {
  return doc.replace(/[.\-\/\s]/g, "").trim();
}

// ---------------------------------------------------------------------------
// Full import pipeline
// ---------------------------------------------------------------------------

export function processImport(
  csvContent: string,
  entityType: EntityType,
  mapping: CsvColumnMapping[],
  existingRecords: Array<{ name: string; document?: string | null; email?: string | null }>,
  delimiter = ",",
): ImportResult {
  const rows = parseCsvContent(csvContent, delimiter);
  if (rows.length === 0) {
    return { totalRows: 0, validRows: 0, invalidRows: 0, duplicateRows: 0, errors: [], preview: [] };
  }

  const headers = rows[0].values;
  const dataRows = rows.slice(1); // skip header row

  const parsed: ParsedRow[] = dataRows.map((row) => {
    const data = mapRowToFields(row.values, headers, mapping);
    const errors = validateRow(data, entityType);
    return { lineNumber: row.lineNumber, data, errors };
  });

  // Find duplicates
  const validRows = parsed.filter((r) => r.errors.length === 0);
  const validData = validRows.map((r) => r.data);
  const duplicateIndices = findDuplicates(validData, existingRecords);

  const errors: Array<{ lineNumber: number; message: string }> = [];
  for (const row of parsed) {
    for (const err of row.errors) {
      errors.push({ lineNumber: row.lineNumber, message: err });
    }
  }

  const duplicateCount = duplicateIndices.size;
  const duplicateRows = validRows.filter((_, i) => duplicateIndices.has(i));
  for (const row of duplicateRows) {
    errors.push({ lineNumber: row.lineNumber, message: "Registro duplicado" });
  }

  return {
    totalRows: dataRows.length,
    validRows: parsed.filter((r) => r.errors.length === 0).length - duplicateCount,
    invalidRows: parsed.filter((r) => r.errors.length > 0).length,
    duplicateRows: duplicateCount,
    errors,
    preview: parsed.slice(0, 10).map((r) => r.data),
  };
}
