import { z } from "zod";

export const providerSchema = z.enum(["internal_sandbox", "reserved_external"]);
export const environmentSchema = z.enum(["sandbox", "production"]);
export const publicConfigurationSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({});
export const credentialsSchema = z.record(z.string().min(1), z.string().min(1)).refine((value) => Object.keys(value).length > 0, "CREDENCIAIS_OBRIGATORIAS");
export const createProviderConfigurationSchema = z.object({ provider: providerSchema, environment: environmentSchema, displayName: z.string().trim().min(1).max(120), publicConfiguration: publicConfigurationSchema, credentials: credentialsSchema.optional(), idempotencyKey: z.string().trim().min(8).max(160) });
export const updateProviderConfigurationSchema = z.object({ id: z.string().uuid(), displayName: z.string().trim().min(1).max(120).optional(), publicConfiguration: publicConfigurationSchema.optional(), lockVersion: z.number().int().positive(), idempotencyKey: z.string().trim().min(8).max(160) });
export const replaceCredentialsSchema = z.object({ id: z.string().uuid(), credentials: credentialsSchema, lockVersion: z.number().int().positive(), idempotencyKey: z.string().trim().min(8).max(160) });
export const configurationOperationSchema = z.object({ id: z.string().uuid(), lockVersion: z.number().int().positive(), idempotencyKey: z.string().trim().min(8).max(160), productionConfirmation: z.literal("CONFIRM_PRODUCTION").optional() });
export type ProviderCredentials = z.infer<typeof credentialsSchema>;
