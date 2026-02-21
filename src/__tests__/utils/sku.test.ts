import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateSku, ensureUniqueSku } from "@/lib/utils/sku";

// ensureUniqueSku uses the global prisma mock from setup.ts
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateSku", () => {
  it("generates full SKU from all parts", () => {
    const sku = generateSku({
      brand: "Ray-Ban",
      model: "RB5154",
      colorCode: "2000",
      eyeSize: "49",
      bridge: "21",
    });
    expect(sku).toBe("RAY-RB5154-2000-49-21");
  });

  it("uses first 3 chars of brand (uppercase)", () => {
    const sku = generateSku({ brand: "Oakley", model: "OX123" });
    expect(sku.startsWith("OAK")).toBe(true);
  });

  it("omits empty optional parts", () => {
    const sku = generateSku({ brand: "Gucci", model: "GG0001O" });
    expect(sku).toBe("GUC-GG0001O");
  });

  it("strips special characters from brand", () => {
    const sku = generateSku({ brand: "Saint-Laurent", model: "SL001" });
    expect(sku.startsWith("SAI")).toBe(true);
  });

  it("falls back to UNK prefix when brand is omitted", () => {
    // Current implementation uses "UNK" as default brand prefix
    const sku = generateSku({});
    expect(sku).toBe("UNK");
  });

  it("handles undefined optional parts gracefully", () => {
    const sku = generateSku({ brand: "Prada", model: undefined, colorCode: undefined });
    expect(sku).toBe("PRA");
  });
});

describe("ensureUniqueSku", () => {
  it("returns baseSku when no collision exists", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.findMany.mockResolvedValue([]);

    const result = await ensureUniqueSku("RAY-RB5154-2000-49-21");
    expect(result).toBe("RAY-RB5154-2000-49-21");
  });

  it("returns baseSku when prefix-matched items don't collide exactly", async () => {
    const prisma = await getPrisma();
    // Existing sku starts with baseSku but isn't equal — no collision
    prisma.inventoryItem.findMany.mockResolvedValue([
      { sku: "RAY-RB5154-2000-49-21-OTHER" },
    ]);

    const result = await ensureUniqueSku("RAY-RB5154-2000-49-21");
    expect(result).toBe("RAY-RB5154-2000-49-21");
  });

  it("appends -2 when baseSku already exists", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.findMany.mockResolvedValue([
      { sku: "RAY-RB5154-2000-49-21" },
    ]);

    const result = await ensureUniqueSku("RAY-RB5154-2000-49-21");
    expect(result).toBe("RAY-RB5154-2000-49-21-2");
  });

  it("appends -3 when baseSku and -2 both exist", async () => {
    const prisma = await getPrisma();
    prisma.inventoryItem.findMany.mockResolvedValue([
      { sku: "RAY-RB5154-2000-49-21" },
      { sku: "RAY-RB5154-2000-49-21-2" },
    ]);

    const result = await ensureUniqueSku("RAY-RB5154-2000-49-21");
    expect(result).toBe("RAY-RB5154-2000-49-21-3");
  });
});
