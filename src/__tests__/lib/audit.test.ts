import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildPrismaMock } from "../mocks/prisma";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as ReturnType<typeof buildPrismaMock>;
}

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an audit log record with correct fields", async () => {
    const prisma = await getPrisma();
    prisma.auditLog.create.mockResolvedValue({} as any);

    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      userId: "user-1",
      action: "CREATE",
      model: "Customer",
      recordId: "cust-1",
      changes: { after: { name: "John" } },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "CREATE",
        model: "Customer",
        recordId: "cust-1",
        changes: { after: { name: "John" } },
      }),
    });
  });

  it("sets userId to null when not provided", async () => {
    const prisma = await getPrisma();
    prisma.auditLog.create.mockResolvedValue({} as any);

    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      action: "LOGIN_FAILED",
      model: "User",
      recordId: "user-1",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null, action: "LOGIN_FAILED" }),
    });
  });

  it("sets changes to null when not provided", async () => {
    const prisma = await getPrisma();
    prisma.auditLog.create.mockResolvedValue({} as any);

    const { logAudit } = await import("@/lib/audit");
    await logAudit({ action: "DELETE", model: "Order", recordId: "ord-1" });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ changes: null }),
    });
  });

  it("does not propagate DB errors (try/catch swallows them)", async () => {
    const prisma = await getPrisma();
    prisma.auditLog.create.mockRejectedValue(new Error("DB connection failed"));

    const { logAudit } = await import("@/lib/audit");
    await expect(
      logAudit({ action: "CREATE", model: "Order", recordId: "ord-1" })
    ).resolves.toBeUndefined();
  });

  it("extracts first IP from x-forwarded-for header", async () => {
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockImplementation((key: string) =>
        key === "x-forwarded-for" ? "192.168.1.1, 10.0.0.1" : null
      ),
    } as any);

    const prisma = await getPrisma();
    prisma.auditLog.create.mockResolvedValue({} as any);

    const { logAudit } = await import("@/lib/audit");
    await logAudit({ action: "LOGIN", model: "User", recordId: "u1" });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ipAddress: "192.168.1.1" }),
    });
  });

  it("sets ipAddress to null when header is absent", async () => {
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as any);

    const prisma = await getPrisma();
    prisma.auditLog.create.mockResolvedValue({} as any);

    const { logAudit } = await import("@/lib/audit");
    await logAudit({ action: "LOGOUT", model: "User", recordId: "u1" });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ipAddress: null }),
    });
  });
});
