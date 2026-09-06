const ITERATIONS = 210_000;
const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 16;
const PREFIX = "pbkdf2";
const HASH_ALG = "sha256";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: HASH_ALG },
    keyMaterial,
    KEY_LENGTH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await deriveKey(password, salt, ITERATIONS);
  return `${PREFIX}:${HASH_ALG}:${ITERATIONS}:${toBase64(salt)}:${toBase64(hash)}`;
}

/** Verifies a password against a stored `pbkdf2:...` hash. Returns false for any malformed value. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 5) return false;
  const [scheme, hashAlg, iterationsStr, saltB64, hashB64] = parts;
  if (scheme !== PREFIX || hashAlg !== HASH_ALG) return false;

  const iterations = Number(iterationsStr);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10_000_000) return false;

  try {
    const salt = fromBase64(saltB64);
    const expected = fromBase64(hashB64);
    const actual = await deriveKey(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}