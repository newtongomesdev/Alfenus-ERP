import { describe, expect, it } from "vitest";

import { documentSchema } from "../validations/foundation";

// ---------------------------------------------------------------------------
// Mock domain constants (mirror the server action's mapping)
// ---------------------------------------------------------------------------

const entityTableMap: Record<string, string> = {
  cliente: "clients",
  processo: "legal_cases",
  contrato: "contracts",
  prazo: "deadlines",
  tarefa: "tasks",
};

const entityPathMap: Record<string, string> = {
  cliente: "/clientes",
  processo: "/processos",
  contrato: "/contratos",
  prazo: "/prazos",
  tarefa: "/tarefas",
};

const VALID_ENTITY_TYPES = ["cliente", "processo", "contrato", "prazo", "tarefa", "outro"];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildStoragePath(lawFirmId: string, fileName: string): string {
  const uuid = "test-uuid";
  return `${lawFirmId}/${uuid}-${sanitizeFileName(fileName)}`;
}

function mapEntityTypeToTable(entityType: string): string | undefined {
  return entityTableMap[entityType];
}

function mapEntityTypeToPath(entityType: string): string | undefined {
  return entityPathMap[entityType];
}

function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_FILE_TYPES.includes(mimeType);
}

function isWithinSizeLimit(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Document upload – entity type mapping", () => {
  it("maps cliente to clients table", () => {
    expect(mapEntityTypeToTable("cliente")).toBe("clients");
  });

  it("maps processo to legal_cases table", () => {
    expect(mapEntityTypeToTable("processo")).toBe("legal_cases");
  });

  it("maps contrato to contracts table", () => {
    expect(mapEntityTypeToTable("contrato")).toBe("contracts");
  });

  it("maps prazo to deadlines table", () => {
    expect(mapEntityTypeToTable("prazo")).toBe("deadlines");
  });

  it("maps tarefa to tasks table", () => {
    expect(mapEntityTypeToTable("tarefa")).toBe("tasks");
  });

  it("returns undefined for unmapped entity type", () => {
    expect(mapEntityTypeToTable("outro")).toBeUndefined();
    expect(mapEntityTypeToTable("invalid")).toBeUndefined();
  });

  it("maps entity types to correct paths", () => {
    expect(mapEntityTypeToPath("cliente")).toBe("/clientes");
    expect(mapEntityTypeToPath("processo")).toBe("/processos");
    expect(mapEntityTypeToPath("contrato")).toBe("/contratos");
    expect(mapEntityTypeToPath("prazo")).toBe("/prazos");
    expect(mapEntityTypeToPath("tarefa")).toBe("/tarefas");
  });

  it("returns undefined path for outro", () => {
    expect(mapEntityTypeToPath("outro")).toBeUndefined();
  });
});

describe("Document upload – entity ID validation", () => {
  it("accepts valid UUID entity ID", () => {
    const result = documentSchema.safeParse({
      name: "Doc Teste",
      entityType: "cliente",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty entity ID (optional)", () => {
    const result = documentSchema.safeParse({
      name: "Doc Teste",
      entityType: "cliente",
      entityId: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts no entityId field (optional)", () => {
    const result = documentSchema.safeParse({
      name: "Doc Teste",
      entityType: "cliente",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID format for entityId", () => {
    const result = documentSchema.safeParse({
      name: "Doc Teste",
      entityType: "cliente",
      entityId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts entity ID for outro type", () => {
    const result = documentSchema.safeParse({
      name: "Doc Teste",
      entityType: "outro",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});

describe("Document upload – file type restrictions", () => {
  it("allows PDF files", () => {
    expect(isAllowedFileType("application/pdf")).toBe(true);
  });

  it("allows JPEG images", () => {
    expect(isAllowedFileType("image/jpeg")).toBe(true);
  });

  it("allows PNG images", () => {
    expect(isAllowedFileType("image/png")).toBe(true);
  });

  it("allows WEBP images", () => {
    expect(isAllowedFileType("image/webp")).toBe(true);
  });

  it("allows Word documents", () => {
    expect(isAllowedFileType("application/msword")).toBe(true);
    expect(isAllowedFileType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
  });

  it("allows plain text", () => {
    expect(isAllowedFileType("text/plain")).toBe(true);
  });

  it("rejects executable files", () => {
    expect(isAllowedFileType("application/x-executable")).toBe(false);
  });

  it("rejects HTML files", () => {
    expect(isAllowedFileType("text/html")).toBe(false);
  });

  it("rejects unknown mime types", () => {
    expect(isAllowedFileType("")).toBe(false);
  });
});

describe("Document upload – file size validation", () => {
  it("accepts valid file size", () => {
    expect(isWithinSizeLimit(1024)).toBe(true);
  });

  it("rejects zero-byte file", () => {
    expect(isWithinSizeLimit(0)).toBe(false);
  });

  it("rejects negative file size", () => {
    expect(isWithinSizeLimit(-1)).toBe(false);
  });

  it("accepts max size (20 MB)", () => {
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES)).toBe(true);
  });

  it("rejects file over max size", () => {
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES + 1)).toBe(false);
  });
});

describe("Document upload – tenant scoping", () => {
  it("storage path includes law firm ID", () => {
    const path = buildStoragePath("firm-abc-123", "documento.pdf");
    expect(path).toContain("firm-abc-123/");
  });

  it("storage path sanitizes special characters in filename", () => {
    const path = buildStoragePath("firm-1", "My Doc (1).pdf");
    expect(path).toContain("My_Doc__1_.pdf");
  });

  it("storage path preserves safe characters", () => {
    const path = buildStoragePath("firm-1", "document-v2.final.pdf");
    expect(path).toContain("document-v2.final.pdf");
  });

  it("document schema validates entity type from enum", () => {
    for (const entityType of VALID_ENTITY_TYPES) {
      const result = documentSchema.safeParse({
        name: "Teste",
        entityType,
      });
      expect(result.success).toBe(true);
    }
  });

  it("document schema rejects invalid entity type", () => {
    const result = documentSchema.safeParse({
      name: "Teste",
      entityType: "invalido",
    });
    expect(result.success).toBe(false);
  });
});
