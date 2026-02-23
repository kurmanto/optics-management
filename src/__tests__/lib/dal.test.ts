import { describe, it, expect, beforeEach, vi } from "vitest";

// Override the global @/lib/dal mock to use real implementations for this file
vi.mock("@/lib/dal", async (importOriginal) => {
  return importOriginal();
});

// Partially mock @/lib/auth so getSession is controllable
vi.mock("@/lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth")>();
  return { ...original, getSession: vi.fn() };
});

describe("verifyRole", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("allows STAFF user to access STAFF-level actions", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      email: "staff@test.com",
      name: "Staff User",
      role: "STAFF",
      mustChangePassword: false,
      fontSizePreference: "MEDIUM" as const,
    });

    const { verifyRole } = await import("@/lib/dal");
    const { redirect } = await import("next/navigation");

    await verifyRole("STAFF");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("allows ADMIN user to access STAFF-level actions", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
      mustChangePassword: false,
      fontSizePreference: "MEDIUM" as const,
    });

    const { verifyRole } = await import("@/lib/dal");
    const { redirect } = await import("next/navigation");

    await verifyRole("STAFF");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("allows ADMIN user to access ADMIN-level actions", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
      mustChangePassword: false,
      fontSizePreference: "MEDIUM" as const,
    });

    const { verifyRole } = await import("@/lib/dal");
    const { redirect } = await import("next/navigation");

    await verifyRole("ADMIN");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects VIEWER attempting STAFF-level actions", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      email: "viewer@test.com",
      name: "Viewer User",
      role: "VIEWER",
      mustChangePassword: false,
      fontSizePreference: "MEDIUM" as const,
    });

    const { verifyRole } = await import("@/lib/dal");
    const { redirect } = await import("next/navigation");

    await verifyRole("STAFF");
    expect(redirect).toHaveBeenCalledWith(
      "/dashboard?error=insufficient_permissions"
    );
  });

  it("redirects VIEWER attempting ADMIN-level actions", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      email: "viewer@test.com",
      name: "Viewer User",
      role: "VIEWER",
      mustChangePassword: false,
      fontSizePreference: "MEDIUM" as const,
    });

    const { verifyRole } = await import("@/lib/dal");
    const { redirect } = await import("next/navigation");

    await verifyRole("ADMIN");
    expect(redirect).toHaveBeenCalledWith(
      "/dashboard?error=insufficient_permissions"
    );
  });

  it("redirects STAFF attempting ADMIN-level actions", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      email: "staff@test.com",
      name: "Staff User",
      role: "STAFF",
      mustChangePassword: false,
      fontSizePreference: "MEDIUM" as const,
    });

    const { verifyRole } = await import("@/lib/dal");
    const { redirect } = await import("next/navigation");

    await verifyRole("ADMIN");
    expect(redirect).toHaveBeenCalledWith(
      "/dashboard?error=insufficient_permissions"
    );
  });

  it("returns the session on successful role check", async () => {
    const { getSession } = await import("@/lib/auth");
    const session = {
      id: "u1",
      email: "staff@test.com",
      name: "Staff User",
      role: "STAFF",
      mustChangePassword: false,
      fontSizePreference: "MEDIUM" as const,
    };
    vi.mocked(getSession).mockResolvedValue(session);

    const { verifyRole } = await import("@/lib/dal");
    const result = await verifyRole("STAFF");
    expect(result).toEqual(session);
  });

  it("redirects to /login when no session exists", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(null);

    const { verifyRole } = await import("@/lib/dal");
    const { redirect } = await import("next/navigation");

    // In tests, redirect() is a no-op mock (doesn't throw), so code continues
    // after the redirect call and hits a null access — we catch that error.
    try {
      await verifyRole("STAFF");
    } catch {
      // Expected: null session causes error after redirect mock doesn't halt execution
    }

    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
