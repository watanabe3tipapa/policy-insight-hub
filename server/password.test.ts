import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./_core/password";

describe("password hashing (PBKDF2)", () => {
  it("hashes and verifies a password", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^pbkdf2:SHA-256:\d+:/);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it("produces a unique salt per hash", async () => {
    const hashA = await hashPassword("same-password");
    const hashB = await hashPassword("same-password");
    expect(hashA).not.toBe(hashB);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("returns false for malformed stored hashes", async () => {
    await expect(verifyPassword("any-password", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("any-password", "pbkdf2:SHA-256:210000:AAAA")).resolves.toBe(false);
    await expect(verifyPassword("any-password", "pbkdf2:SHA-256:0:AAAA:BBBB")).resolves.toBe(false);
    await expect(verifyPassword("any-password", "pbkdf2:SHA-256:abc:AAAA:BBBB")).resolves.toBe(false);
  });
});