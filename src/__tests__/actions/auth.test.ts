import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";
import { makeFormData } from "../mocks/formdata";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...original,
    createSession: vi.fn().mockResolvedValue(undefined),
    destroySession: vi.fn().mockResolvedValue(undefined),
    // verifyPassword and hashPassword keep real implementations
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("login action", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { verifySession } = await import("@/lib/dal");
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
  });

  it("returns error for invalid email format", async () => {
    const { login } = await import("@/lib/actions/auth");
    const fd = makeFormData({ email: "not-an-email", password: "secret" });
    const result = await login({}, fd);
    expect(result.error).toBeDefined();
  });

  it("returns error when user not found", async () => {
    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const { login } = await import("@/lib/actions/auth");
    const fd = makeFormData({
      email: "unknown@test.com",
      password: "password123",
    });
    const result = await login({}, fd);
    expect(result.error).toBe("Invalid email or password");
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });

  it("returns error when user is inactive", async () => {
    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "inactive@test.com",
      isActive: false,
      passwordHash: "hash",
    });

    const { login } = await import("@/lib/actions/auth");
    const fd = makeFormData({
      email: "inactive@test.com",
      password: "password123",
    });
    const result = await login({}, fd);
    expect(result.error).toBe("Invalid email or password");
  });

  it("returns error when password is wrong", async () => {
    const { hashPassword } = await import("@/lib/auth");
    const hash = await hashPassword("correctPassword");

    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "user@test.com",
      isActive: true,
      passwordHash: hash,
    });

    const { login } = await import("@/lib/actions/auth");
    const fd = makeFormData({
      email: "user@test.com",
      password: "wrongPassword",
    });
    const result = await login({}, fd);
    expect(result.error).toBe("Invalid email or password");
  });

  it("calls createSession and redirects on valid credentials", async () => {
    const { hashPassword } = await import("@/lib/auth");
    const hash = await hashPassword("validPass1");

    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "user@test.com",
      isActive: true,
      passwordHash: hash,
    });

    const { createSession } = await import("@/lib/auth");
    const { redirect } = await import("next/navigation");

    const { login } = await import("@/lib/actions/auth");
    const fd = makeFormData({ email: "user@test.com", password: "validPass1" });

    // redirect() throws in Next.js — catch it
    try {
      await login({}, fd);
    } catch {
      // redirect throws — that's expected
    }

    expect(createSession).toHaveBeenCalled();
  });
});

describe("logout action", () => {
  it("destroys session and redirects to /login", async () => {
    const { destroySession } = await import("@/lib/auth");
    const { redirect } = await import("next/navigation");

    const { logout } = await import("@/lib/actions/auth");
    try {
      await logout();
    } catch {
      // redirect throws
    }

    expect(destroySession).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

describe("changePassword action", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { verifySession } = await import("@/lib/dal");
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
  });

  it("returns error when new passwords do not match", async () => {
    const { changePassword } = await import("@/lib/actions/auth");
    const fd = makeFormData({
      currentPassword: "old",
      newPassword: "newPassword1!",
      confirmPassword: "differentPassword1!",
    });
    const result = await changePassword({}, fd);
    expect(result.error).toBeDefined();
  });

  it("returns error when new password is too short", async () => {
    const { changePassword } = await import("@/lib/actions/auth");
    const fd = makeFormData({
      currentPassword: "old",
      newPassword: "short",
      confirmPassword: "short",
    });
    const result = await changePassword({}, fd);
    expect(result.error).toBeDefined();
  });

  it("returns error when current password is wrong", async () => {
    const { hashPassword } = await import("@/lib/auth");
    const hash = await hashPassword("actualCurrent");

    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: mockSession.id,
      passwordHash: hash,
    });

    const { changePassword } = await import("@/lib/actions/auth");
    const fd = makeFormData({
      currentPassword: "wrongCurrent",
      newPassword: "newPassword1!",
      confirmPassword: "newPassword1!",
    });
    const result = await changePassword({}, fd);
    expect(result.error).toBe("Current password is incorrect");
  });

  it("updates password and returns success when all valid", async () => {
    const { hashPassword } = await import("@/lib/auth");
    const hash = await hashPassword("currentPass1");

    const prisma = await getPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: mockSession.id,
      passwordHash: hash,
    });
    prisma.user.update.mockResolvedValue({ id: mockSession.id });

    const { changePassword } = await import("@/lib/actions/auth");
    const fd = makeFormData({
      currentPassword: "currentPass1",
      newPassword: "newPassword1!",
      confirmPassword: "newPassword1!",
    });
    const result = await changePassword({}, fd);
    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockSession.id },
        data: expect.objectContaining({ mustChangePassword: false }),
      })
    );
  });
});
