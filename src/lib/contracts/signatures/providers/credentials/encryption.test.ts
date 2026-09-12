import { beforeEach, describe, expect, it } from "vitest";
import { decryptProviderCredentials, encryptProviderCredentials } from "./encryption";

describe("signature provider credentials encryption", () => {
  beforeEach(() => { process.env.SIGNATURE_PROVIDER_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; });
  const context = { lawFirmId: "00000000-0000-0000-0000-000000000001", provider: "internal_sandbox", environment: "sandbox" };
  it("round trips with authenticated encryption and unique nonce", () => { const a = encryptProviderCredentials({ apiToken: "API_SECRET_SHOULD_NOT_LEAK" }, context); const b = encryptProviderCredentials({ apiToken: "API_SECRET_SHOULD_NOT_LEAK" }, context); expect(a).not.toBe(b); expect(decryptProviderCredentials(a, context)).toEqual({ apiToken: "API_SECRET_SHOULD_NOT_LEAK" }); expect(a).not.toContain("API_SECRET_SHOULD_NOT_LEAK"); });
  it("rejects tampering and wrong tenant context without exposing plaintext", () => { const encrypted = encryptProviderCredentials({ webhookSecret: "WEBHOOK_SECRET_SHOULD_NOT_LEAK" }, context); const parts = encrypted.split("."); parts[3] = `${parts[3]}x`; expect(() => decryptProviderCredentials(parts.join("."), context)).toThrow("SIGNATURE_PROVIDER_CREDENTIALS_DECRYPT_FAILED"); expect(() => decryptProviderCredentials(encrypted, { ...context, lawFirmId: "00000000-0000-0000-0000-000000000002" })).toThrow("SIGNATURE_PROVIDER_CREDENTIALS_DECRYPT_FAILED"); });
});
