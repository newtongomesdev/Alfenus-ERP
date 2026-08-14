import { SignatureEnvelopeError } from "../errors";
import { internalSandboxAdapter } from "./sandbox";
import type { SignatureProvider, SignatureProviderAdapter } from "./types";

const adapters: Partial<Record<SignatureProvider, SignatureProviderAdapter>> = { internal_sandbox: internalSandboxAdapter };
export function getSignatureProviderAdapter(input: string | { provider: string; configurationReference?: { lawFirmId: string; configurationId?: string; environment: "sandbox" | "production" } }): SignatureProviderAdapter {
  const provider = typeof input === "string" ? input : input.provider;
  const adapter = adapters[provider as SignatureProvider];
  if (provider === "reserved_external") throw new SignatureEnvelopeError("PROVIDER_NOT_IMPLEMENTED");
  if (!adapter) throw new SignatureEnvelopeError("SIGNATURE_PROVIDER_UNKNOWN");
  return adapter;
}
export function isSignatureSandboxEnabled() { return process.env.NODE_ENV !== "production" || process.env.SIGNATURE_SANDBOX_ENABLED === "true"; }
