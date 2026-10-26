import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  let hashBuf: Buffer;
  try {
    hashBuf = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (hashBuf.length !== KEYLEN) return false;

  const test = scryptSync(password, salt, KEYLEN);
  return timingSafeEqual(test, hashBuf);
}
