import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const key = () => {
  const raw = process.env.SIGNATURE_PROVIDER_ENCRYPTION_KEY;
  if (!raw) throw new Error("SIGNATURE_PROVIDER_ENCRYPTION_KEY_MISSING");
  const decoded = raw.length === 64 && /^[0-9a-f]+$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("SIGNATURE_PROVIDER_ENCRYPTION_KEY_INVALID");
  return decoded;
};

export function encryptProviderCredentials(value: Record<string, string>, context: { lawFirmId: string; provider: string; environment: string }) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`${context.lawFirmId}:${context.provider}:${context.environment}:${VERSION}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${VERSION}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptProviderCredentials(ciphertext: string, context: { lawFirmId: string; provider: string; environment: string }) {
  try {
    const [version, ivRaw, tagRaw, dataRaw] = ciphertext.split(".");
    if (version !== VERSION || !ivRaw || !tagRaw || !dataRaw) throw new Error("invalid_ciphertext");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    decipher.setAAD(Buffer.from(`${context.lawFirmId}:${context.provider}:${context.environment}:${version}`, "utf8"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
    return JSON.parse(plaintext) as Record<string, string>;
  } catch {
    throw new Error("SIGNATURE_PROVIDER_CREDENTIALS_DECRYPT_FAILED");
  }
}

export const credentialsKeyVersion = VERSION;
