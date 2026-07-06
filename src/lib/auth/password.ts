import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing. Argon2id is the current OWASP recommendation for password
 * storage. These run only in the Node.js runtime (Server Actions / seed), never
 * at the edge, because @node-rs/argon2 is a native binding.
 */

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}
