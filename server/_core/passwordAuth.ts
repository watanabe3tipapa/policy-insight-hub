import * as db from "../db";
import { ENV } from "./env";
import { hashPassword, verifyPassword } from "./password";
import type { User } from "../../drizzle/schema";

export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidUsername(username: string): boolean {
  return username.length >= 2 && username.length <= 64 && USERNAME_PATTERN.test(username);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

/**
 * Authenticates a username + password login. The account is created on first
 * successful login (self-registration); the username matching `ADMIN_USERNAME`
 * is granted the admin role. Returns `null` when the password is wrong for an
 * existing account, so the caller can respond with a generic error.
 */
export async function authenticateWithPassword(
  username: string,
  password: string
): Promise<User | null> {
  const existing = await db.getUserByUsername(username);

  if (existing) {
    if (!existing.passwordHash) return null;
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) return null;
    await db.upsertUser({ openId: existing.openId, lastSignedIn: new Date() });
    return existing;
  }

  const passwordHash = await hashPassword(password);
  const role = username === ENV.adminUsername ? "admin" : "user";
  const user = await db.createPasswordUser({ username, passwordHash, role });
  return user ?? null;
}