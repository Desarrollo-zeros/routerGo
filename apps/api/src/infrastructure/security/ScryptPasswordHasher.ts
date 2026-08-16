import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { PasswordHasher } from "../../application/services/SessionAuthService.js";

export class ScryptPasswordHasher implements PasswordHasher {
  hash(password: string): string {
    const salt = randomBytes(16);
    const derived = scryptSync(password, salt, 64);
    return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
  }

  verify(password: string, encoded: string): boolean {
    const [, saltValue, hashValue] = encoded.split("$");
    if (!saltValue || !hashValue) return false;
    const expected = Buffer.from(hashValue, "base64url");
    const actual = scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
