import { describe, it, expect, beforeAll } from "vitest";

// We test hashPassword and verifyPassword directly (they use bcrypt, no Next.js deps).
// createSessionToken and verifySessionToken are private — we test them indirectly via
// the exported session flow, but since they're private, we test the observable contracts.

// Set SESSION_SECRET so token functions work
beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-key-for-unit-tests-32chars";
});

// Lazy import AFTER env is set to avoid "cannot read properties of undefined"
async function getAuthModule() {
  return import("@/lib/auth");
}

describe("hashPassword + verifyPassword", () => {
  it("verifies a correctly hashed password", async () => {
    const { hashPassword, verifyPassword } = await getAuthModule();
    const hash = await hashPassword("myPassword123");
    expect(typeof hash).toBe("string");
    expect(hash).not.toBe("myPassword123");
    const valid = await verifyPassword("myPassword123", hash);
    expect(valid).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const { hashPassword, verifyPassword } = await getAuthModule();
    const hash = await hashPassword("correctPassword");
    const valid = await verifyPassword("wrongPassword", hash);
    expect(valid).toBe(false);
  });

  it("produces different hashes for the same password (bcrypt salt)", async () => {
    const { hashPassword } = await getAuthModule();
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
  });
});
