import type { Role } from "@/lib/auth/permissions";
export const canManageSignatureEnvelope = (role: Role) => role === "proprietario" || role === "administrador" || role === "advogado";
