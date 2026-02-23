import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockAdminSession } from "../mocks/session";
import { makeFormData } from "../mocks/formdata";
import { buildPrismaMock } from "../mocks/prisma";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as ReturnType<typeof buildPrismaMock>;
}

// ── createBreachReport ────────────────────────────────────────────────────────

describe("createBreachReport", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { verifyRole } = await import("@/lib/dal");
    vi.mocked(verifyRole).mockResolvedValue(mockAdminSession as any);
  });

  it("creates a breach report with valid data and returns its id", async () => {
    const prisma = await getPrisma();
    const fakeReport = {
      id: "br_test_abc123",
      discoveredAt: new Date("2026-02-01"),
      description: "Unauthorized access to patient record files",
      affectedCount: 10,
      dataTypes: ["PHI"],
      containmentActions: "Revoked access credentials immediately",
      status: "OPEN",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.breachReport.create.mockResolvedValue(fakeReport as any);

    const { createBreachReport } = await import("@/lib/actions/breach");
    const fd = makeFormData({
      discoveredAt: "2026-02-01",
      description: "Unauthorized access to patient record files",
      affectedCount: "10",
      containmentActions: "Revoked access credentials immediately",
      dataTypes: ["PHI"],
    });

    const result = await createBreachReport({}, fd);
    expect(result.id).toBe("br_test_abc123");
    expect(result.error).toBeUndefined();
    expect(prisma.breachReport.create).toHaveBeenCalled();
  });

  it("returns error when description is too short (< 10 chars)", async () => {
    const { createBreachReport } = await import("@/lib/actions/breach");
    const fd = makeFormData({
      discoveredAt: "2026-02-01",
      description: "short",
      affectedCount: "5",
      containmentActions: "Contained the breach by revoking access now",
      dataTypes: ["PHI"],
    });

    const result = await createBreachReport({}, fd);
    expect(result.error).toBeDefined();
    expect(result.id).toBeUndefined();
  });

  it("returns error when containment actions is too short (< 10 chars)", async () => {
    const { createBreachReport } = await import("@/lib/actions/breach");
    const fd = makeFormData({
      discoveredAt: "2026-02-01",
      description: "A detailed breach description with sufficient length",
      affectedCount: "5",
      containmentActions: "none",
      dataTypes: ["PHI"],
    });

    const result = await createBreachReport({}, fd);
    expect(result.error).toBeDefined();
  });

  it("returns error when no data types are selected", async () => {
    const { createBreachReport } = await import("@/lib/actions/breach");
    const fd = makeFormData({
      discoveredAt: "2026-02-01",
      description: "A detailed breach description with sufficient length",
      affectedCount: "5",
      containmentActions: "Contained the breach by revoking access completely",
    });
    // No dataTypes appended

    const result = await createBreachReport({}, fd);
    expect(result.error).toBeDefined();
  });

  it("returns error when affectedCount is zero", async () => {
    const { createBreachReport } = await import("@/lib/actions/breach");
    const fd = makeFormData({
      discoveredAt: "2026-02-01",
      description: "A detailed breach description with sufficient length",
      affectedCount: "0",
      containmentActions: "Contained the breach by revoking access completely",
      dataTypes: ["PHI"],
    });

    const result = await createBreachReport({}, fd);
    expect(result.error).toBeDefined();
  });

  it("returns error on DB failure", async () => {
    const prisma = await getPrisma();
    prisma.breachReport.create.mockRejectedValue(new Error("DB error"));

    const { createBreachReport } = await import("@/lib/actions/breach");
    const fd = makeFormData({
      discoveredAt: "2026-02-01",
      description: "A detailed breach description with sufficient length",
      affectedCount: "10",
      containmentActions: "Contained the breach by revoking access completely",
      dataTypes: ["PHI"],
    });

    const result = await createBreachReport({}, fd);
    expect(result.error).toBe("Failed to create breach report");
  });
});

// ── updateBreachStatus ────────────────────────────────────────────────────────

describe("updateBreachStatus", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { verifyRole } = await import("@/lib/dal");
    vi.mocked(verifyRole).mockResolvedValue(mockAdminSession as any);
  });

  it("updates breach status and returns success", async () => {
    const prisma = await getPrisma();
    prisma.breachReport.update.mockResolvedValue({} as any);

    const { updateBreachStatus } = await import("@/lib/actions/breach");
    const result = await updateBreachStatus("br_1", "INVESTIGATING");

    expect(result).toEqual({ success: true });
    expect(prisma.breachReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "br_1" },
        data: expect.objectContaining({ status: "INVESTIGATING" }),
      })
    );
  });

  it("sets ipcNotifiedAt when advancing to IPC_NOTIFIED", async () => {
    const prisma = await getPrisma();
    prisma.breachReport.update.mockResolvedValue({} as any);

    const notifiedAt = new Date("2026-02-22T10:00:00Z");
    const { updateBreachStatus } = await import("@/lib/actions/breach");
    await updateBreachStatus("br_1", "IPC_NOTIFIED", notifiedAt);

    expect(prisma.breachReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "IPC_NOTIFIED",
          ipcNotifiedAt: notifiedAt,
        }),
      })
    );
  });

  it("sets individualsNotifiedAt when advancing to INDIVIDUALS_NOTIFIED", async () => {
    const prisma = await getPrisma();
    prisma.breachReport.update.mockResolvedValue({} as any);

    const notifiedAt = new Date("2026-02-23T10:00:00Z");
    const { updateBreachStatus } = await import("@/lib/actions/breach");
    await updateBreachStatus("br_1", "INDIVIDUALS_NOTIFIED", notifiedAt);

    expect(prisma.breachReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "INDIVIDUALS_NOTIFIED",
          individualsNotifiedAt: notifiedAt,
        }),
      })
    );
  });

  it("returns error on DB failure", async () => {
    const prisma = await getPrisma();
    prisma.breachReport.update.mockRejectedValue(new Error("DB error"));

    const { updateBreachStatus } = await import("@/lib/actions/breach");
    const result = await updateBreachStatus("br_1", "RESOLVED");

    expect(result).toEqual({ error: "Failed to update breach status" });
  });
});

// ── generateIPCNotificationText ───────────────────────────────────────────────

describe("generateIPCNotificationText", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { verifyRole } = await import("@/lib/dal");
    vi.mocked(verifyRole).mockResolvedValue(mockAdminSession as any);
  });

  it("returns formatted IPC letter with all breach details", async () => {
    const prisma = await getPrisma();
    prisma.breachReport.findUnique.mockResolvedValue({
      id: "br_1",
      discoveredAt: new Date("2026-02-01"),
      createdAt: new Date("2026-02-02"),
      description: "Unauthorized access to patient records",
      affectedCount: 50,
      dataTypes: ["PHI", "prescriptions"],
      containmentActions: "Access revoked immediately and passwords reset",
      status: "OPEN",
      ipcNotifiedAt: null,
      individualsNotifiedAt: null,
    } as any);

    const { generateIPCNotificationText } = await import("@/lib/actions/breach");
    const text = await generateIPCNotificationText("br_1");

    expect(text).toContain("PRIVACY BREACH NOTIFICATION");
    expect(text).toContain("Mint Vision Optique");
    expect(text).toContain("50");
    expect(text).toContain("PHI, prescriptions");
    expect(text).toContain("Unauthorized access to patient records");
    expect(text).toContain("PHIPA");
    expect(text).toContain("Section 12");
  });

  it("includes IPC notification date when already notified", async () => {
    const prisma = await getPrisma();
    const ipcDate = new Date("2026-02-10");
    prisma.breachReport.findUnique.mockResolvedValue({
      id: "br_1",
      discoveredAt: new Date("2026-02-01"),
      createdAt: new Date("2026-02-02"),
      description: "Unauthorized access to patient records",
      affectedCount: 5,
      dataTypes: ["PHI"],
      containmentActions: "Access revoked immediately",
      status: "IPC_NOTIFIED",
      ipcNotifiedAt: ipcDate,
      individualsNotifiedAt: null,
    } as any);

    const { generateIPCNotificationText } = await import("@/lib/actions/breach");
    const text = await generateIPCNotificationText("br_1");

    expect(text).toContain("IPC Notified");
  });

  it("returns 'Report not found.' when ID does not exist", async () => {
    const prisma = await getPrisma();
    prisma.breachReport.findUnique.mockResolvedValue(null);

    const { generateIPCNotificationText } = await import("@/lib/actions/breach");
    const text = await generateIPCNotificationText("nonexistent-id");

    expect(text).toBe("Report not found.");
  });
});
