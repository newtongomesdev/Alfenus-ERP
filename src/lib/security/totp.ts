/**
 * Utilitarios TOTP (Time-based One-Time Password) - RFC 6238/4226
 * Implementacao manual sem dependencias externas.
 */

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DIGITS = 6;
const PERIOD = 30; // segundos
const TOTP_EPOCH = 0; // Unix epoch

// ---------------------------------------------------------------------------
// Base32 encoding / decoding
// ---------------------------------------------------------------------------

export function encodeBase32(buffer: Uint8Array): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }
  // Pad para multiplo de 5
  while (bits.length % 5 !== 0) bits += "0";

  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const index = parseInt(bits.slice(i, i + 5), 2);
    result += BASE32_CHARS[index];
  }
  return result;
}

export function decodeBase32(encoded: string): Uint8Array {
  const clean = encoded.replace(/[\s=]+/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) throw new Error(`Caractere Base32 invalido: ${char}`);
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Secret generation
// ---------------------------------------------------------------------------

export function generateSecret(): string {
  const bytes = new Uint8Array(20); // 160 bits = 32 chars base32
  crypto.getRandomValues(bytes);
  return encodeBase32(bytes);
}

// ---------------------------------------------------------------------------
// OTP Auth URI (para QR Code)
// ---------------------------------------------------------------------------

export function generateQRCodeUri(
  secret: string,
  email: string,
  issuer: string = "ERP Juridico"
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  const encodedSecret = encodeURIComponent(secret);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

// ---------------------------------------------------------------------------
// HMAC-SHA1 via Web Crypto API
// ---------------------------------------------------------------------------

async function hmacSha1(
  key: Uint8Array,
  message: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

// ---------------------------------------------------------------------------
// HOTP - RFC 4226
// ---------------------------------------------------------------------------

async function hotp(
  secret: Uint8Array,
  counter: number,
  digits: number = DIGITS
): Promise<string> {
  // Counter como 8-byte big-endian
  const counterBuffer = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const hmac = await hmacSha1(secret, counterBuffer);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

// ---------------------------------------------------------------------------
// TOTP - RFC 6238
// ---------------------------------------------------------------------------

function getCurrentTimeStep(): number {
  return Math.floor((Date.now() / 1000 - TOTP_EPOCH) / PERIOD);
}

export async function generateToken(secret: string): Promise<string> {
  const key = decodeBase32(secret);
  const timeStep = getCurrentTimeStep();
  return hotp(key, timeStep);
}

export async function verifyToken(
  secret: string,
  token: string,
  window: number = 1
): Promise<boolean> {
  const key = decodeBase32(secret);
  const timeStep = getCurrentTimeStep();
  const cleanToken = token.replace(/\s/g, "");

  if (!/^\d{6}$/.test(cleanToken)) return false;

  // Verificar janela de tempo (window步 ao lado)
  for (let i = -window; i <= window; i++) {
    const expected = await hotp(key, timeStep + i);
    if (expected === cleanToken) return true;
  }
  return false;
}

/**
 * Gera URI formatado para exibicao (com espacos a cada 4 caracteres).
 */
export function formatSecretForDisplay(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}
