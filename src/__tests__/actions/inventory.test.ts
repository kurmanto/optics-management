import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";
import { makeFormData } from "../mocks/formdata";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

const validItemFormData = {
  brand: "Ray-Ban",
  model: "RB5154",
  category: "OPTICAL",
  gender: "UNISEX",
  stockQuantity: "5",
  reorderPoint: "2",
};

describe("createInventoryItem", () => {
  it("returns fieldErrors when brand is missing", async () => {
    const { createInventoryItem } = await import("@/lib/actions/inventory");
    const fd = makeFormData({ ...validItemFormData, brand: "" });
    const result = await createInventoryItem({}, fd);
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors!.brand).toBeDefined();
  });

  it("calls prisma.inventoryItem.create on valid data", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.findMany.mockResolvedValue([]); // for ensureUniqueSku
    prisma.inventoryItem.create.mockResolvedValue({ id: "item-1" });

    const { createInventoryItem } = await import("@/lib/actions/inventory");
    const fd = makeFormData(validItemFormData);

    try {
      await createInventoryItem({}, fd);
    } catch {
      // redirect throws after successful creation
    }

    expect(prisma.inventoryItem.create).toHaveBeenCalled();
  });

  it("returns error on duplicate SKU (P2002)", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.create.mockRejectedValue({ code: "P2002" });

    const { createInventoryItem } = await import("@/lib/actions/inventory");
    const fd = makeFormData({ ...validItemFormData, sku: "DUPLICATE-SKU" });
    const result = await createInventoryItem({}, fd);
    expect(result.error).toMatch(/SKU already exists/i);
  });
});

describe("updateInventoryItem", () => {
  it("calls prisma.inventoryItem.update with correct id", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({ id: "item-1" });

    const { updateInventoryItem } = await import("@/lib/actions/inventory");
    const fd = makeFormData(validItemFormData);

    try {
      await updateInventoryItem("item-1", {}, fd);
    } catch {
      // redirect throws
    }

    const calls = prisma.inventoryItem.update.mock.calls;
    // First call should be the main update (second is photo update if any)
    expect(calls[0][0]).toMatchObject({ where: { id: "item-1" } });
  });
});

describe("applyMarkdown", () => {
  it("calls update with clamped markdownPct", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({});

    const { applyMarkdown } = await import("@/lib/actions/inventory");
    const result = await applyMarkdown("item-1", 25);
    expect(result.error).toBeUndefined();
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: { markdownPct: 25 },
      })
    );
  });

  it("clamps value at 100", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({});

    const { applyMarkdown } = await import("@/lib/actions/inventory");
    await applyMarkdown("item-1", 150);
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { markdownPct: 100 } })
    );
  });

  it("clamps value at 0 for negative", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({});

    const { applyMarkdown } = await import("@/lib/actions/inventory");
    await applyMarkdown("item-1", -20);
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { markdownPct: 0 } })
    );
  });
});

describe("markAsDisplayed", () => {
  it("updates item with isDisplayed:true, displayedAt, and location, returns { success: true }", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({});

    const { markAsDisplayed } = await import("@/lib/actions/inventory");
    const result = await markAsDisplayed("item-1", "Wall A");

    expect(result).toEqual({ success: true });
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          isDisplayed: true,
          displayedAt: expect.any(Date),
          displayLocation: "Wall A",
        }),
      })
    );
  });

  it("sets displayLocation to null when location is omitted", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({});

    const { markAsDisplayed } = await import("@/lib/actions/inventory");
    await markAsDisplayed("item-1");

    const callData = prisma.inventoryItem.update.mock.calls[0][0].data;
    expect(callData.displayLocation).toBeNull();
  });

  it("returns { error } when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockRejectedValue(new Error("DB error"));

    const { markAsDisplayed } = await import("@/lib/actions/inventory");
    const result = await markAsDisplayed("item-1", "Shelf B");
    expect("error" in result).toBe(true);
  });
});

describe("removeFromDisplay", () => {
  it("updates item with isDisplayed: false, returns { success: true }", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({});

    const { removeFromDisplay } = await import("@/lib/actions/inventory");
    const result = await removeFromDisplay("item-1");

    expect(result).toEqual({ success: true });
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: { isDisplayed: false },
      })
    );
  });

  it("returns { error } when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockRejectedValue(new Error("DB error"));

    const { removeFromDisplay } = await import("@/lib/actions/inventory");
    const result = await removeFromDisplay("item-missing");
    expect("error" in result).toBe(true);
  });
});

describe("autoGenerateSku", () => {
  it("returns SKU matching generateSku output when no collisions exist", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.findMany.mockResolvedValue([]); // no collisions

    const { autoGenerateSku } = await import("@/lib/actions/inventory");
    const { generateSku } = await import("@/lib/utils/sku");

    const parts = { brand: "Ray-Ban", model: "RB5154", colorCode: "2000", eyeSize: "49", bridge: "21" };
    const result = await autoGenerateSku(parts);
    expect(result.sku).toBe(generateSku(parts));
  });
});

describe("updateAbcCategory", () => {
  it("calls update with category A", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({});

    const { updateAbcCategory } = await import("@/lib/actions/inventory");
    const result = await updateAbcCategory("item-1", "A");
    expect(result.error).toBeUndefined();
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: { abcCategory: "A" },
      })
    );
  });

  it("calls update with null to clear category", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.update.mockResolvedValue({});

    const { updateAbcCategory } = await import("@/lib/actions/inventory");
    const result = await updateAbcCategory("item-1", null);
    expect(result.error).toBeUndefined();
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { abcCategory: null } })
    );
  });
});
