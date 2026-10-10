import { createHmac, createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function safeEqualString(a: string, b: string): boolean {
  const left = sha256(a);
  const right = sha256(b);
  return timingSafeEqual(left, right);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(secret: string, email: string, ttlMs: number): string {
  const body = Buffer.from(
    JSON.stringify({ e: email, exp: Date.now() + ttlMs }),
    "utf8",
  ).toString("base64url");
  return `${body}.${signPayload(secret, body)}`;
}

export function decodeSession(secret: string, token: string): { email: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signPayload(secret, body);
  if (!safeEqualString(sig, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      e?: string;
      exp?: number;
    };
    if (!parsed.e || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return { email: parsed.e };
  } catch {
    return null;
  }
}

export function decodeBase64Payload(data: string): Buffer {
  const cleaned = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  return Buffer.from(cleaned, "base64");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    if (salt.length < 8 || expected.length < 16) return false;
    const key = (await scryptAsync(password, salt, 64)) as Buffer;
    if (key.length !== expected.length) return false;
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}