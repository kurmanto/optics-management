import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

vi.mock("@/lib/email", () => ({
  sendMagicLinkEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvoiceEmail: vi.fn(),
  sendIntakeEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  timingSafeDelay: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.clearAllMocks();
  // Reset rate limit to allow by default
  const { checkRateLimit } = await import("@/lib/rate-limit");
  vi.mocked(checkRateLimit).mockReturnValue(true);
});

// ── requestMagicLink ──────────────────────────────────────────────────────────

describe("requestMagicLink", () => {
  it("returns success and creates magic link for valid email with existing account", async () => {
    const { requestMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { sendMagicLinkEmail } = await import("@/lib/email");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      primaryCustomer: { firstName: "John", lastName: "Doe" },
    } as any);
    vi.mocked(prisma.magicLink.create).mockResolvedValue({ id: "ml-1" } as any);

    const formData = new FormData();
    formData.set("email", "test@example.com");

    const result = await requestMagicLink(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(vi.mocked(prisma.magicLink.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientAccountId: "account-1",
          channel: "EMAIL",
          destination: "test@example.com",
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      })
    );
    expect(vi.mocked(sendMagicLinkEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        name: "John Doe",
        loginUrl: expect.stringContaining("/my/verify?token="),
      })
    );
  });

  it("returns success even for non-existent email (prevents enumeration)", async () => {
    const { requestMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { sendMagicLinkEmail } = await import("@/lib/email");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("email", "nonexistent@example.com");

    const result = await requestMagicLink(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    // No magic link should be created for non-existent account
    expect(vi.mocked(prisma.magicLink.create)).not.toHaveBeenCalled();
    // No email should be sent
    expect(vi.mocked(sendMagicLinkEmail)).not.toHaveBeenCalled();
  });

  it("returns error for invalid email format", async () => {
    const { requestMagicLink } = await import("@/lib/actions/client-auth");

    const formData = new FormData();
    formData.set("email", "not-an-email");

    const result = await requestMagicLink(null, formData);

    expect(result.error).toBeDefined();
    expect(result.success).toBeUndefined();
  });

  it("returns success when rate limited without creating magic link", async () => {
    const { requestMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { checkRateLimit } = await import("@/lib/rate-limit");

    vi.mocked(checkRateLimit).mockReturnValue(false);

    const formData = new FormData();
    formData.set("email", "test@example.com");

    const result = await requestMagicLink(null, formData);

    expect(result.success).toBe(true);
    // Should not even look up the account when rate limited
    expect(vi.mocked(prisma.clientAccount.findUnique)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.magicLink.create)).not.toHaveBeenCalled();
  });

  it("normalizes email to lowercase", async () => {
    const { requestMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("email", "Test@Example.COM");

    await requestMagicLink(null, formData);

    expect(vi.mocked(prisma.clientAccount.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: "test@example.com" }),
      })
    );
  });
});

// ── verifyMagicLink ───────────────────────────────────────────────────────────

describe("verifyMagicLink", () => {
  it("creates session for valid unused token and returns empty object when password is set", async () => {
    const { verifyMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { createClientSession } = await import("@/lib/client-auth");
    const { logAudit } = await import("@/lib/audit");

    vi.mocked(prisma.magicLink.findUnique).mockResolvedValue({
      id: "ml-1",
      token: "valid-token",
      clientAccountId: "account-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      clientAccount: {
        id: "account-1",
        passwordHash: "hashed-password",
      },
    } as any);
    vi.mocked(prisma.magicLink.update).mockResolvedValue({} as any);
    vi.mocked(prisma.clientAccount.update).mockResolvedValue({} as any);

    const result = await verifyMagicLink("valid-token");

    expect(result).toEqual({});
    expect(result.error).toBeUndefined();
    expect(result.resetPassword).toBeUndefined();
    expect(vi.mocked(createClientSession)).toHaveBeenCalledWith("account-1");
    expect(vi.mocked(prisma.magicLink.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ml-1" },
        data: { usedAt: expect.any(Date) },
      })
    );
    // Should reset failed login attempts
    expect(vi.mocked(prisma.clientAccount.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "account-1" },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
    );
    expect(vi.mocked(logAudit)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CLIENT_LOGIN",
        model: "ClientAccount",
        recordId: "account-1",
        changes: { method: "magic_link" },
      })
    );
  });

  it("returns resetPassword: true when no password is set", async () => {
    const { verifyMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { createClientSession } = await import("@/lib/client-auth");

    vi.mocked(prisma.magicLink.findUnique).mockResolvedValue({
      id: "ml-2",
      token: "no-pw-token",
      clientAccountId: "account-2",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      clientAccount: {
        id: "account-2",
        passwordHash: null, // No password set
      },
    } as any);
    vi.mocked(prisma.magicLink.update).mockResolvedValue({} as any);
    vi.mocked(prisma.clientAccount.update).mockResolvedValue({} as any);

    const result = await verifyMagicLink("no-pw-token");

    expect(result.resetPassword).toBe(true);
    expect(result.error).toBeUndefined();
    expect(vi.mocked(createClientSession)).toHaveBeenCalledWith("account-2");
  });

  it("returns error for non-existent token", async () => {
    const { verifyMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { createClientSession } = await import("@/lib/client-auth");

    vi.mocked(prisma.magicLink.findUnique).mockResolvedValue(null);

    const result = await verifyMagicLink("nonexistent-token");

    expect(result.error).toBe("Invalid or expired link. Please request a new one.");
    expect(vi.mocked(createClientSession)).not.toHaveBeenCalled();
  });

  it("returns error for already-used token", async () => {
    const { verifyMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { createClientSession } = await import("@/lib/client-auth");

    vi.mocked(prisma.magicLink.findUnique).mockResolvedValue({
      id: "ml-3",
      token: "used-token",
      clientAccountId: "account-1",
      usedAt: new Date("2025-01-01"), // Already used
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      clientAccount: { id: "account-1", passwordHash: "hash" },
    } as any);

    const result = await verifyMagicLink("used-token");

    expect(result.error).toBe("This link has already been used. Please request a new one.");
    expect(vi.mocked(createClientSession)).not.toHaveBeenCalled();
  });

  it("returns error for expired token", async () => {
    const { verifyMagicLink } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { createClientSession } = await import("@/lib/client-auth");

    vi.mocked(prisma.magicLink.findUnique).mockResolvedValue({
      id: "ml-4",
      token: "expired-token",
      clientAccountId: "account-1",
      usedAt: null,
      expiresAt: new Date("2020-01-01"), // Expired
      clientAccount: { id: "account-1", passwordHash: "hash" },
    } as any);

    const result = await verifyMagicLink("expired-token");

    expect(result.error).toBe("This link has expired. Please request a new one.");
    expect(vi.mocked(createClientSession)).not.toHaveBeenCalled();
  });
});

// ── clientLogin ───────────────────────────────────────────────────────────────

describe("clientLogin", () => {
  it("redirects on valid credentials", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { verifyClientPassword, createClientSession } = await import("@/lib/client-auth");
    const { redirect } = await import("next/navigation");
    const { logAudit } = await import("@/lib/audit");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      passwordHash: "hashed-pw",
      failedLoginAttempts: 0,
      lockedUntil: null,
      isActive: true,
    } as any);
    vi.mocked(verifyClientPassword).mockResolvedValue(true);
    vi.mocked(prisma.clientAccount.update).mockResolvedValue({} as any);

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "ValidPassword1!");

    try {
      await clientLogin(null, formData);
    } catch {
      // redirect throws
    }

    expect(vi.mocked(createClientSession)).toHaveBeenCalledWith("account-1");
    expect(vi.mocked(prisma.clientAccount.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "account-1" },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
    );
    expect(vi.mocked(logAudit)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CLIENT_LOGIN",
        changes: { method: "password" },
      })
    );
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/my");
  });

  it("returns error for invalid email format", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");

    const formData = new FormData();
    formData.set("email", "not-an-email");
    formData.set("password", "somepassword");

    const result = await clientLogin(null, formData);

    expect(result.error).toBeDefined();
  });

  it("returns error for empty password", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "");

    const result = await clientLogin(null, formData);

    expect(result.error).toBeDefined();
  });

  it("returns error for non-existent account", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("email", "nonexistent@example.com");
    formData.set("password", "anyPassword1!");

    const result = await clientLogin(null, formData);

    expect(result.error).toBe("Invalid email or password.");
  });

  it("returns error for account without password", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      passwordHash: null, // No password set
      failedLoginAttempts: 0,
      lockedUntil: null,
      isActive: true,
    } as any);

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "anyPassword1!");

    const result = await clientLogin(null, formData);

    expect(result.error).toBe("Invalid email or password.");
  });

  it("returns error for wrong password and increments failedLoginAttempts", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { verifyClientPassword } = await import("@/lib/client-auth");
    const { logAudit } = await import("@/lib/audit");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      passwordHash: "hashed-pw",
      failedLoginAttempts: 2,
      lockedUntil: null,
      isActive: true,
    } as any);
    vi.mocked(verifyClientPassword).mockResolvedValue(false);
    vi.mocked(prisma.clientAccount.update).mockResolvedValue({} as any);

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "wrongPassword1!");

    const result = await clientLogin(null, formData);

    expect(result.error).toBe("Invalid email or password.");
    expect(vi.mocked(prisma.clientAccount.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "account-1" },
        data: expect.objectContaining({
          failedLoginAttempts: 3,
          lockedUntil: null, // Not locked yet (only 3 attempts)
        }),
      })
    );
    expect(vi.mocked(logAudit)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CLIENT_LOGIN_FAILED",
        model: "ClientAccount",
        recordId: "account-1",
      })
    );
  });

  it("returns lockout error after 5th failed attempt and sets lockedUntil", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { verifyClientPassword } = await import("@/lib/client-auth");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      passwordHash: "hashed-pw",
      failedLoginAttempts: 4, // Next failure is the 5th
      lockedUntil: null,
      isActive: true,
    } as any);
    vi.mocked(verifyClientPassword).mockResolvedValue(false);
    vi.mocked(prisma.clientAccount.update).mockResolvedValue({} as any);

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "wrongPassword1!");

    const result = await clientLogin(null, formData);

    expect(result.error).toBe("Account temporarily locked due to too many failed attempts.");
    expect(vi.mocked(prisma.clientAccount.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      })
    );
  });

  it("returns lockout error when account is still locked", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { verifyClientPassword } = await import("@/lib/client-auth");

    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      passwordHash: "hashed-pw",
      failedLoginAttempts: 5,
      lockedUntil: futureDate,
      isActive: true,
    } as any);

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "anyPassword1!");

    const result = await clientLogin(null, formData);

    expect(result.error).toBe("Account temporarily locked. Please try again later or use a sign-in link.");
    // Should not attempt password verification
    expect(vi.mocked(verifyClientPassword)).not.toHaveBeenCalled();
  });

  it("resets failedLoginAttempts on successful login", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { verifyClientPassword } = await import("@/lib/client-auth");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      passwordHash: "hashed-pw",
      failedLoginAttempts: 3,
      lockedUntil: null,
      isActive: true,
    } as any);
    vi.mocked(verifyClientPassword).mockResolvedValue(true);
    vi.mocked(prisma.clientAccount.update).mockResolvedValue({} as any);

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "correctPassword1!");

    try {
      await clientLogin(null, formData);
    } catch {
      // redirect throws
    }

    expect(vi.mocked(prisma.clientAccount.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "account-1" },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
    );
  });

  it("returns rate limit error when too many attempts", async () => {
    const { clientLogin } = await import("@/lib/actions/client-auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");

    vi.mocked(checkRateLimit).mockReturnValue(false);

    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "anyPassword1!");

    const result = await clientLogin(null, formData);

    expect(result.error).toBe("Too many login attempts. Please try again later.");
  });
});

// ── clientLogout ──────────────────────────────────────────────────────────────

describe("clientLogout", () => {
  it("destroys session and redirects to /my/login", async () => {
    const { clientLogout } = await import("@/lib/actions/client-auth");
    const { getClientSession, destroyClientSession } = await import("@/lib/client-auth");
    const { redirect } = await import("next/navigation");
    const { logAudit } = await import("@/lib/audit");

    vi.mocked(getClientSession).mockResolvedValue({
      clientAccountId: "account-1",
    } as any);

    try {
      await clientLogout();
    } catch {
      // redirect throws
    }

    expect(vi.mocked(destroyClientSession)).toHaveBeenCalled();
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/my/login");
    expect(vi.mocked(logAudit)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CLIENT_LOGOUT",
        model: "ClientAccount",
        recordId: "account-1",
      })
    );
  });

  it("still destroys session and redirects when no active session", async () => {
    const { clientLogout } = await import("@/lib/actions/client-auth");
    const { getClientSession, destroyClientSession } = await import("@/lib/client-auth");
    const { redirect } = await import("next/navigation");
    const { logAudit } = await import("@/lib/audit");

    vi.mocked(getClientSession).mockResolvedValue(null);

    try {
      await clientLogout();
    } catch {
      // redirect throws
    }

    expect(vi.mocked(destroyClientSession)).toHaveBeenCalled();
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/my/login");
    // logAudit should NOT be called when there is no session
    expect(vi.mocked(logAudit)).not.toHaveBeenCalled();
  });
});

// ── setClientPassword ─────────────────────────────────────────────────────────

describe("setClientPassword", () => {
  it("sets password and returns success", async () => {
    const { setClientPassword } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { getClientSession, hashClientPassword } = await import("@/lib/client-auth");
    const { logAudit } = await import("@/lib/audit");

    vi.mocked(getClientSession).mockResolvedValue({
      clientAccountId: "account-1",
    } as any);
    vi.mocked(hashClientPassword).mockResolvedValue("new-hashed-pw");
    vi.mocked(prisma.clientAccount.update).mockResolvedValue({} as any);

    const formData = new FormData();
    formData.set("password", "NewPassword1");
    formData.set("confirmPassword", "NewPassword1");

    const result = await setClientPassword(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(vi.mocked(hashClientPassword)).toHaveBeenCalledWith("NewPassword1");
    expect(vi.mocked(prisma.clientAccount.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "account-1" },
        data: { passwordHash: "new-hashed-pw" },
      })
    );
    expect(vi.mocked(logAudit)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CLIENT_PASSWORD_CHANGE",
        model: "ClientAccount",
        recordId: "account-1",
      })
    );
  });

  it("returns error when not authenticated", async () => {
    const { setClientPassword } = await import("@/lib/actions/client-auth");
    const { getClientSession } = await import("@/lib/client-auth");

    vi.mocked(getClientSession).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("password", "NewPassword1");
    formData.set("confirmPassword", "NewPassword1");

    const result = await setClientPassword(null, formData);

    expect(result.error).toBe("Not authenticated.");
  });

  it("returns error for password too short", async () => {
    const { setClientPassword } = await import("@/lib/actions/client-auth");
    const { getClientSession } = await import("@/lib/client-auth");

    vi.mocked(getClientSession).mockResolvedValue({
      clientAccountId: "account-1",
    } as any);

    const formData = new FormData();
    formData.set("password", "Short1");
    formData.set("confirmPassword", "Short1");

    const result = await setClientPassword(null, formData);

    expect(result.error).toBeDefined();
  });

  it("returns error for password missing uppercase", async () => {
    const { setClientPassword } = await import("@/lib/actions/client-auth");
    const { getClientSession } = await import("@/lib/client-auth");

    vi.mocked(getClientSession).mockResolvedValue({
      clientAccountId: "account-1",
    } as any);

    const formData = new FormData();
    formData.set("password", "alllowercase1");
    formData.set("confirmPassword", "alllowercase1");

    const result = await setClientPassword(null, formData);

    expect(result.error).toBeDefined();
  });

  it("returns error for password missing number", async () => {
    const { setClientPassword } = await import("@/lib/actions/client-auth");
    const { getClientSession } = await import("@/lib/client-auth");

    vi.mocked(getClientSession).mockResolvedValue({
      clientAccountId: "account-1",
    } as any);

    const formData = new FormData();
    formData.set("password", "NoNumberHere");
    formData.set("confirmPassword", "NoNumberHere");

    const result = await setClientPassword(null, formData);

    expect(result.error).toBeDefined();
  });

  it("returns error when passwords do not match", async () => {
    const { setClientPassword } = await import("@/lib/actions/client-auth");
    const { getClientSession } = await import("@/lib/client-auth");

    vi.mocked(getClientSession).mockResolvedValue({
      clientAccountId: "account-1",
    } as any);

    const formData = new FormData();
    formData.set("password", "ValidPassword1");
    formData.set("confirmPassword", "DifferentPassword1");

    const result = await setClientPassword(null, formData);

    expect(result.error).toBe("Passwords do not match");
  });
});

// ── requestPasswordReset ──────────────────────────────────────────────────────

describe("requestPasswordReset", () => {
  it("returns success and creates magic link for valid email with existing account", async () => {
    const { requestPasswordReset } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { sendPasswordResetEmail } = await import("@/lib/email");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      primaryCustomer: { firstName: "Jane", lastName: "Smith" },
    } as any);
    vi.mocked(prisma.magicLink.create).mockResolvedValue({ id: "ml-reset" } as any);

    const formData = new FormData();
    formData.set("email", "test@example.com");

    const result = await requestPasswordReset(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(vi.mocked(prisma.magicLink.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientAccountId: "account-1",
          channel: "EMAIL",
          destination: "test@example.com",
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      })
    );
    expect(vi.mocked(sendPasswordResetEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        name: "Jane Smith",
        resetUrl: expect.stringContaining("/my/verify?token="),
      })
    );
    // Should include reset=1 in the URL
    expect(vi.mocked(sendPasswordResetEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        resetUrl: expect.stringContaining("&reset=1"),
      })
    );
  });

  it("returns success for non-existent email (prevents enumeration)", async () => {
    const { requestPasswordReset } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { sendPasswordResetEmail } = await import("@/lib/email");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("email", "nonexistent@example.com");

    const result = await requestPasswordReset(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(vi.mocked(prisma.magicLink.create)).not.toHaveBeenCalled();
    expect(vi.mocked(sendPasswordResetEmail)).not.toHaveBeenCalled();
  });

  it("returns error for invalid email format", async () => {
    const { requestPasswordReset } = await import("@/lib/actions/client-auth");

    const formData = new FormData();
    formData.set("email", "bad-email");

    const result = await requestPasswordReset(null, formData);

    expect(result.error).toBeDefined();
    expect(result.success).toBeUndefined();
  });

  it("returns success when rate limited without creating magic link", async () => {
    const { requestPasswordReset } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { checkRateLimit } = await import("@/lib/rate-limit");

    vi.mocked(checkRateLimit).mockReturnValue(false);

    const formData = new FormData();
    formData.set("email", "test@example.com");

    const result = await requestPasswordReset(null, formData);

    expect(result.success).toBe(true);
    expect(vi.mocked(prisma.clientAccount.findUnique)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.magicLink.create)).not.toHaveBeenCalled();
  });

  it("normalizes email to lowercase", async () => {
    const { requestPasswordReset } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("email", "TEST@Example.COM");

    await requestPasswordReset(null, formData);

    expect(vi.mocked(prisma.clientAccount.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: "test@example.com" }),
      })
    );
  });

  it("silently handles email send failure", async () => {
    const { requestPasswordReset } = await import("@/lib/actions/client-auth");
    const { prisma } = await import("@/lib/prisma");
    const { sendPasswordResetEmail } = await import("@/lib/email");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      id: "account-1",
      email: "test@example.com",
      primaryCustomer: { firstName: "Jane", lastName: "Smith" },
    } as any);
    vi.mocked(prisma.magicLink.create).mockResolvedValue({ id: "ml-1" } as any);
    vi.mocked(sendPasswordResetEmail).mockRejectedValue(new Error("SMTP failure"));

    const formData = new FormData();
    formData.set("email", "test@example.com");

    const result = await requestPasswordReset(null, formData);

    // Should still return success despite email failure
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
