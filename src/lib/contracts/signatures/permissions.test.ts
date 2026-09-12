import { describe, expect, it } from "vitest";
import { canManageSignatureEnvelope } from "./permissions";
import type { Role } from "@/lib/auth/permissions";

describe("signature permissions", () => {
  it("allows only internal legal editors", () => {
    expect((["proprietario", "administrador", "advogado"] as Role[]).every(canManageSignatureEnvelope)).toBe(true);
    expect((["assistente", "colaborador", "visualizador"] as Role[]).some(canManageSignatureEnvelope)).toBe(false);
  });
});
