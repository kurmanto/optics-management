import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClientSession } from "../mocks/client-session";

vi.mock("@/lib/email", () => ({
  sendMagicLinkEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvoiceEmail: vi.fn(),
  sendIntakeEmail: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifyClientSession } = await import("@/lib/client-dal");
  vi.mocked(verifyClientSession).mockResolvedValue(mockClientSession);
});

describe("getFamilyOverview", () => {
  it("returns family data scoped to familyId", async () => {
    const { getFamilyOverview } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.family.findUnique).mockResolvedValue({
      id: "family-1",
      name: "Smith",
      tierLevel: 1,
      tierPointsTotal: 750,
      avatarUrl: null,
    } as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", firstName: "John", lastName: "Smith", dateOfBirth: null },
    ] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.insurancePolicy.findMany).mockResolvedValue([]);
    vi.mocked(prisma.storeCredit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([]);

    const result = await getFamilyOverview();

    expect(result).not.toBeNull();
    expect(result!.family.name).toBe("Smith");
    expect(result!.members).toHaveLength(1);
    expect(vi.mocked(prisma.family.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "family-1" } })
    );
  });

  it("returns null when family not found", async () => {
    const { getFamilyOverview } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.family.findUnique).mockResolvedValue(null);

    const result = await getFamilyOverview();
    expect(result).toBeNull();
  });
});

describe("getMemberProfile", () => {
  it("returns profile for valid family member", async () => {
    const { getMemberProfile } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "c1",
      firstName: "John",
      lastName: "Smith",
      dateOfBirth: null,
      email: "john@test.com",
      phone: "1234567890",
      familyId: "family-1",
    } as any);
    vi.mocked(prisma.exam.findMany).mockResolvedValue([]);
    vi.mocked(prisma.prescription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    const result = await getMemberProfile("c1");

    expect(result).not.toBeNull();
    expect(result!.customer.firstName).toBe("John");
  });

  it("returns null for customer in different family", async () => {
    const { getMemberProfile } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "c2",
      firstName: "Alice",
      lastName: "Other",
      familyId: "family-999",
    } as any);

    const result = await getMemberProfile("c2");
    expect(result).toBeNull();
  });

  it("returns null for non-existent customer", async () => {
    const { getMemberProfile } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

    const result = await getMemberProfile("nonexistent");
    expect(result).toBeNull();
  });
});

describe("getExamDetail", () => {
  it("returns exam with Rx comparison for family member", async () => {
    const { getExamDetail } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.exam.findUnique).mockResolvedValue({
      id: "exam-1",
      examDate: new Date("2026-01-15"),
      examType: "COMPREHENSIVE",
      doctorName: "Smith",
      customer: { id: "c1", firstName: "John", lastName: "Smith", familyId: "family-1" },
      prescriptions: [{
        id: "rx-1",
        date: new Date("2026-01-15"),
        type: "GLASSES",
        odSphere: -2.0,
        odCylinder: -0.5,
        odAxis: 180,
        odAdd: null,
        odPd: 32,
        osSphere: -1.75,
        osCylinder: -0.25,
        osAxis: 5,
        osAdd: null,
        osPd: 31,
        pdBinocular: 63,
        isActive: true,
      }],
    } as any);

    vi.mocked(prisma.prescription.findFirst).mockResolvedValue({
      id: "rx-old",
      date: new Date("2024-01-10"),
      odSphere: -1.75,
      odCylinder: -0.5,
      odAxis: 180,
      odAdd: null,
      odPd: 32,
      osSphere: -1.5,
      osCylinder: -0.25,
      osAxis: 5,
      osAdd: null,
      osPd: 31,
      pdBinocular: 63,
    } as any);

    const result = await getExamDetail("exam-1");

    expect(result).not.toBeNull();
    expect(result!.exam.doctorName).toBe("Smith");
    expect(result!.currentRx).not.toBeNull();
    expect(result!.previousRx).not.toBeNull();
  });

  it("returns null for exam belonging to different family", async () => {
    const { getExamDetail } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.exam.findUnique).mockResolvedValue({
      id: "exam-other",
      customer: { id: "c99", firstName: "X", lastName: "Y", familyId: "family-other" },
      prescriptions: [],
    } as any);

    const result = await getExamDetail("exam-other");
    expect(result).toBeNull();
  });
});

describe("getUnlockCards", () => {
  it("returns cards scoped to family", async () => {
    const { getUnlockCards } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "uc-1", title: "VIP Badge", status: "LOCKED", type: "FAMILY_VIP" },
      { id: "uc-2", title: "Style Credit", status: "UNLOCKED", type: "STYLE_CREDIT" },
    ] as any);

    const result = await getUnlockCards();

    expect(result).toHaveLength(2);
    expect(vi.mocked(prisma.unlockCard.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: "family-1" } })
    );
  });
});

describe("getFamilyMembers", () => {
  it("returns active members for family", async () => {
    const { getFamilyMembers } = await import("@/lib/actions/client-portal");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", firstName: "John", lastName: "Smith", dateOfBirth: null },
      { id: "c2", firstName: "Jane", lastName: "Smith", dateOfBirth: null },
    ] as any);

    const result = await getFamilyMembers();

    expect(result).toHaveLength(2);
    expect(vi.mocked(prisma.customer.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: "family-1", isActive: true } })
    );
  });
});
