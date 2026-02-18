import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createHmac } from "crypto";

// SESSION_SECRET must be set before auth module is imported
const TEST_SECRET = "test-secret-key-for-unit-tests-32chars";
beforeAll(() => {
  process.env.SESSION_SECRET = TEST_SECRET;
});

// ── Token factory (mirrors the private createSessionToken in auth.ts) ─────────

function makeToken(userId: string, iat = Date.now()): string {
  const payload = JSON.stringify({ userId, iat });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", TEST_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

async function mockCookiesWith(token: string | undefined) {
  const { cookies } = await import("next/headers");
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  } as any);
}

const activeUser = {
  id: "user-1",
  email: "staff@test.com",
  name: "Staff User",
  role: "STAFF",
  mustChangePassword: false,
};

// ── getSession ────────────────────────────────────────────────────────────────

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no cookie is present", async () => {
    await mockCookiesWith(undefined);
    const { getSession } = await import("@/lib/auth");
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("returns null for a tampered token (wrong signature)", async () => {
    const validToken = makeToken("user-1");
    const [encoded] = validToken.split(".");
    const tamperedToken = `${encoded}.invalidsignatureXYZ`;
    await mockCookiesWith(tamperedToken);

    const { getSession } = await import("@/lib/auth");
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("returns null for an expired token (> 7 days old)", async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const expiredToken = makeToken("user-1", eightDaysAgo);
    await mockCookiesWith(expiredToken);

    const { getSession } = await import("@/lib/auth");
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("returns null when the user is not found in the database", async () => {
    const token = makeToken("user-ghost");
    await mockCookiesWith(token);
    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const { getSession } = await import("@/lib/auth");
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("returns SessionUser for a valid token with an active user", async () => {
    const token = makeToken("user-1");
    await mockCookiesWith(token);
    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue(activeUser);

    const { getSession } = await import("@/lib/auth");
    const result = await getSession();
    expect(result).toMatchObject({
      id: "user-1",
      email: "staff@test.com",
      role: "STAFF",
    });
  });

  it("queries prisma with isActive: true filter", async () => {
    const token = makeToken("user-1");
    await mockCookiesWith(token);
    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue(activeUser);

    const { getSession } = await import("@/lib/auth");
    await getSession();

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });

  it("a 6-day-old token (not yet expired) still returns a user", async () => {
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    const token = makeToken("user-1", sixDaysAgo);
    await mockCookiesWith(token);
    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue(activeUser);

    const { getSession } = await import("@/lib/auth");
    const result = await getSession();
    expect(result).not.toBeNull();
    expect(result?.id).toBe("user-1");
  });
});

// ── destroySession ────────────────────────────────────────────────────────────

describe("destroySession", () => {
  it("calls cookie store delete with the session cookie name", async () => {
    const deleteFn = vi.fn();
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      set: vi.fn(),
      delete: deleteFn,
    } as any);

    const { destroySession } = await import("@/lib/auth");
    await destroySession();

    expect(deleteFn).toHaveBeenCalledWith("mvo_session");
  });
});
