import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClientSession } from "../mocks/client-session";

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/unlock-triggers", () => ({
  checkAndUnlockCards: vi.fn(),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifyClientSession } = await import("@/lib/client-dal");
  vi.mocked(verifyClientSession).mockResolvedValue(mockClientSession);
});

const validChoices = {
  shape: "ROUND" as const,
  size: "OVERSIZED" as const,
  material: "ACETATE" as const,
  style: "BOLD" as const,
  color: "WARM" as const,
  vibe: "TRENDY" as const,
};

describe("submitStyleQuiz", () => {
  it("saves style profile and returns label", async () => {
    const { submitStyleQuiz } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
    } as any);
    vi.mocked(prisma.customer.update).mockResolvedValue({} as any);

    const result = await submitStyleQuiz("customer-1", validChoices);

    expect(result.error).toBeUndefined();
    expect(result.profile).toBeDefined();
    expect(result.profile!.label).toBe("Bold Trendsetter");
    expect(result.profile!.choices).toEqual(validChoices);
    expect(vi.mocked(prisma.customer.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "customer-1" },
        data: expect.objectContaining({
          styleProfile: expect.objectContaining({ label: "Bold Trendsetter" }),
        }),
      })
    );
  });

  it("fires checkAndUnlockCards after saving", async () => {
    const { submitStyleQuiz } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({ familyId: "family-1" } as any);
    vi.mocked(prisma.customer.update).mockResolvedValue({} as any);

    await submitStyleQuiz("customer-1", validChoices);

    expect(checkAndUnlockCards).toHaveBeenCalledWith("family-1");
  });

  it("returns error for customer in another family", async () => {
    const { submitStyleQuiz } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "other-family",
    } as any);

    const result = await submitStyleQuiz("customer-1", validChoices);
    expect(result.error).toBe("Invalid family member.");
  });

  it("returns error for invalid choices", async () => {
    const { submitStyleQuiz } = await import("@/lib/actions/client-style");

    const result = await submitStyleQuiz("customer-1", { shape: "INVALID" } as any);
    expect(result.error).toBeDefined();
  });

  it("returns error for empty customerId", async () => {
    const { submitStyleQuiz } = await import("@/lib/actions/client-style");

    const result = await submitStyleQuiz("", validChoices);
    expect(result.error).toBeDefined();
  });
});

describe("getStyleProfile", () => {
  it("returns profile when customer has one", async () => {
    const { getStyleProfile } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    const profile = {
      completedAt: "2026-03-01T12:00:00Z",
      label: "Bold Trendsetter",
      choices: validChoices,
    };

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
      styleProfile: profile,
    } as any);

    const result = await getStyleProfile("customer-1");
    expect(result).toEqual(profile);
  });

  it("returns null when customer has no profile", async () => {
    const { getStyleProfile } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
      styleProfile: null,
    } as any);

    const result = await getStyleProfile("customer-1");
    expect(result).toBeNull();
  });

  it("returns null for customer in another family", async () => {
    const { getStyleProfile } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "other-family",
      styleProfile: {},
    } as any);

    const result = await getStyleProfile("customer-1");
    expect(result).toBeNull();
  });
});

describe("getSavedFrameIds", () => {
  it("returns saved inventory item IDs for customer", async () => {
    const { getSavedFrameIds } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
    } as any);
    vi.mocked(prisma.savedFrame.findMany).mockResolvedValue([
      { inventoryItemId: "inv-1" },
      { inventoryItemId: "inv-2" },
      { inventoryItemId: null },
    ] as any);

    const result = await getSavedFrameIds("customer-1");
    expect(result).toEqual(["inv-1", "inv-2"]);
  });

  it("returns empty array for customer in another family", async () => {
    const { getSavedFrameIds } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "other-family",
    } as any);

    const result = await getSavedFrameIds("customer-1");
    expect(result).toEqual([]);
  });

  it("returns empty array when no saved frames", async () => {
    const { getSavedFrameIds } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
    } as any);
    vi.mocked(prisma.savedFrame.findMany).mockResolvedValue([]);

    const result = await getSavedFrameIds("customer-1");
    expect(result).toEqual([]);
  });
});

describe("toggleSaveFrameFromPortal", () => {
  it("creates SavedFrame with savedBy self when not already saved", async () => {
    const { toggleSaveFrameFromPortal } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
    } as any);
    vi.mocked(prisma.savedFrame.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue({
      brand: "Ray-Ban",
      model: "RB5154",
      color: "Black",
      sku: "RB5154-BLK",
    } as any);
    vi.mocked(prisma.savedFrame.create).mockResolvedValue({} as any);

    const result = await toggleSaveFrameFromPortal("customer-1", "inv-1");
    expect(result).toEqual({ saved: true });
    expect(vi.mocked(prisma.savedFrame.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: "customer-1",
        inventoryItemId: "inv-1",
        brand: "Ray-Ban",
        savedBy: "self",
      }),
    });
  });

  it("deletes existing SavedFrame when already saved", async () => {
    const { toggleSaveFrameFromPortal } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
    } as any);
    vi.mocked(prisma.savedFrame.findFirst).mockResolvedValue({
      id: "saved-1",
      customerId: "customer-1",
      inventoryItemId: "inv-1",
    } as any);
    vi.mocked(prisma.savedFrame.delete).mockResolvedValue({} as any);

    const result = await toggleSaveFrameFromPortal("customer-1", "inv-1");
    expect(result).toEqual({ saved: false });
    expect(vi.mocked(prisma.savedFrame.delete)).toHaveBeenCalledWith({
      where: { id: "saved-1" },
    });
  });

  it("returns error for customer in another family", async () => {
    const { toggleSaveFrameFromPortal } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "other-family",
    } as any);

    const result = await toggleSaveFrameFromPortal("customer-1", "inv-1");
    expect(result).toEqual({ error: "Invalid family member." });
  });

  it("returns error when inventory item not found", async () => {
    const { toggleSaveFrameFromPortal } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
    } as any);
    vi.mocked(prisma.savedFrame.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(null);

    const result = await toggleSaveFrameFromPortal("customer-1", "inv-999");
    expect(result).toEqual({ error: "Frame not found." });
  });
});

describe("getMatchedFrames", () => {
  it("returns frames matching strict filters", async () => {
    const { getMatchedFrames } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
      styleProfile: { completedAt: "2026-03-01", label: "Bold Trendsetter", choices: validChoices },
    } as any);

    const mockFrames = [
      { id: "f1", brand: "Gucci", model: "GG001", color: "Tortoise", material: "Acetate", rimType: "FULL_RIM", retailPrice: 299, imageUrl: null, styleTags: ["round"] },
      { id: "f2", brand: "Ray-Ban", model: "RB4567", color: "Brown", material: "Acetate", rimType: "FULL_RIM", retailPrice: 199, imageUrl: null, styleTags: ["round", "oval"] },
      { id: "f3", brand: "Prada", model: "PR99", color: "Honey", material: "Acetate", rimType: "FULL_RIM", retailPrice: 349, imageUrl: null, styleTags: ["circular"] },
    ];
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue(mockFrames as any);

    const result = await getMatchedFrames("customer-1");
    expect(result).toHaveLength(3);
    expect(vi.mocked(prisma.inventoryItem.findMany)).toHaveBeenCalledTimes(1);
  });

  it("broadens filters when strict returns fewer than 3", async () => {
    const { getMatchedFrames } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
      styleProfile: { completedAt: "2026-03-01", label: "Bold Trendsetter", choices: validChoices },
    } as any);

    // First call (strict): only 1 result
    vi.mocked(prisma.inventoryItem.findMany)
      .mockResolvedValueOnce([{ id: "f1" }] as any)
      // Second call (broadened): 5 results
      .mockResolvedValueOnce([{ id: "f2" }, { id: "f3" }, { id: "f4" }, { id: "f5" }, { id: "f6" }] as any);

    const result = await getMatchedFrames("customer-1");
    expect(result).toHaveLength(5);
    expect(vi.mocked(prisma.inventoryItem.findMany)).toHaveBeenCalledTimes(2);
  });

  it("returns empty array when no style profile", async () => {
    const { getMatchedFrames } = await import("@/lib/actions/client-style");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      familyId: "family-1",
      styleProfile: null,
    } as any);

    const result = await getMatchedFrames("customer-1");
    expect(result).toEqual([]);
  });
});
