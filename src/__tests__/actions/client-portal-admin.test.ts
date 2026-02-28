import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSession, mockAdminSession } from "../mocks/session";

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
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

describe("createClientPortalAccount", () => {
  it("creates account and enables portal on family", async () => {
    const { createClientPortalAccount } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.family.findUnique).mockResolvedValue({ id: "family-1", name: "Smith" } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "customer-1",
      familyId: "family-1",
    } as any);
    // First findUnique call for email check returns null, second for customer check returns null
    vi.mocked(prisma.clientAccount.findUnique)
      .mockResolvedValueOnce(null)  // email check
      .mockResolvedValueOnce(null); // primaryCustomerId check
    // $transaction callback uses tx which is the same mock - mock create to return id
    vi.mocked(prisma.clientAccount.create).mockResolvedValue({ id: "new-account" } as any);
    vi.mocked(prisma.family.update).mockResolvedValue({} as any);

    const formData = new FormData();
    formData.set("familyId", "family-1");
    formData.set("primaryCustomerId", "customer-1");
    formData.set("email", "family@test.com");

    const result = await createClientPortalAccount(formData);

    expect(result.error).toBeUndefined();
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalled();
  });

  it("rejects when family not found", async () => {
    const { createClientPortalAccount } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.family.findUnique).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("familyId", "nonexistent");
    formData.set("primaryCustomerId", "customer-1");
    formData.set("email", "family@test.com");

    const result = await createClientPortalAccount(formData);
    expect(result.error).toBe("Family not found.");
  });

  it("rejects when customer not in family", async () => {
    const { createClientPortalAccount } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.family.findUnique).mockResolvedValue({ id: "family-1" } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "customer-1",
      familyId: "family-other",
    } as any);

    const formData = new FormData();
    formData.set("familyId", "family-1");
    formData.set("primaryCustomerId", "customer-1");
    formData.set("email", "family@test.com");

    const result = await createClientPortalAccount(formData);
    expect(result.error).toBe("Customer does not belong to this family.");
  });

  it("rejects duplicate email", async () => {
    const { createClientPortalAccount } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.family.findUnique).mockResolvedValue({ id: "family-1" } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "customer-1",
      familyId: "family-1",
    } as any);
    // First call for email check returns existing
    vi.mocked(prisma.clientAccount.findUnique)
      .mockResolvedValueOnce({ id: "existing" } as any);

    const formData = new FormData();
    formData.set("familyId", "family-1");
    formData.set("primaryCustomerId", "customer-1");
    formData.set("email", "existing@test.com");

    const result = await createClientPortalAccount(formData);
    expect(result.error).toBe("A portal account already exists for this email.");
  });

  it("rejects invalid email format", async () => {
    const { createClientPortalAccount } = await import("@/lib/actions/client-portal-admin");

    const formData = new FormData();
    formData.set("familyId", "family-1");
    formData.set("primaryCustomerId", "customer-1");
    formData.set("email", "invalid");

    const result = await createClientPortalAccount(formData);
    expect(result.error).toBeDefined();
  });
});

describe("disableClientPortalAccount", () => {
  it("disables account (admin only)", async () => {
    const { verifyRole } = await import("@/lib/dal");
    vi.mocked(verifyRole).mockResolvedValue(mockAdminSession as any);

    const { disableClientPortalAccount } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({ id: "client-1" } as any);
    vi.mocked(prisma.clientAccount.update).mockResolvedValue({} as any);

    const result = await disableClientPortalAccount("client-1");
    expect(result.error).toBeUndefined();
    expect(vi.mocked(prisma.clientAccount.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1" },
        data: { isActive: false },
      })
    );
  });

  it("returns error for non-existent account", async () => {
    const { verifyRole } = await import("@/lib/dal");
    vi.mocked(verifyRole).mockResolvedValue(mockAdminSession as any);

    const { disableClientPortalAccount } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue(null);

    const result = await disableClientPortalAccount("nonexistent");
    expect(result.error).toBe("Account not found.");
  });
});

describe("createUnlockCard", () => {
  it("creates a locked card", async () => {
    const { createUnlockCard } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.create).mockResolvedValue({ id: "uc-1" } as any);

    const formData = new FormData();
    formData.set("familyId", "family-1");
    formData.set("type", "FAMILY_VIP");
    formData.set("title", "VIP Badge");
    formData.set("description", "Unlocked after 5 visits");

    const result = await createUnlockCard(formData);
    expect(result.error).toBeUndefined();
    expect(vi.mocked(prisma.unlockCard.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: "family-1",
          title: "VIP Badge",
          status: "LOCKED",
        }),
      })
    );
  });

  it("rejects missing title", async () => {
    const { createUnlockCard } = await import("@/lib/actions/client-portal-admin");

    const formData = new FormData();
    formData.set("familyId", "family-1");
    formData.set("type", "FAMILY_VIP");
    formData.set("title", "");

    const result = await createUnlockCard(formData);
    expect(result.error).toBeDefined();
  });
});

describe("updateUnlockCardStatus", () => {
  it("transitions card to UNLOCKED", async () => {
    const { updateUnlockCardStatus } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findUnique).mockResolvedValue({
      id: "uc-1",
      status: "LOCKED",
    } as any);
    vi.mocked(prisma.unlockCard.update).mockResolvedValue({} as any);

    const result = await updateUnlockCardStatus("uc-1", "UNLOCKED");
    expect(result.error).toBeUndefined();
    expect(vi.mocked(prisma.unlockCard.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "uc-1" },
        data: expect.objectContaining({ status: "UNLOCKED" }),
      })
    );
  });

  it("returns error for non-existent card", async () => {
    const { updateUnlockCardStatus } = await import("@/lib/actions/client-portal-admin");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findUnique).mockResolvedValue(null);

    const result = await updateUnlockCardStatus("nonexistent", "UNLOCKED");
    expect(result.error).toBe("Card not found.");
  });
});
