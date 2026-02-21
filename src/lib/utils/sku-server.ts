import { prisma } from "@/lib/prisma";

/**
 * Ensure the SKU is unique by appending -2, -3, etc. if collisions exist.
 * SERVER-ONLY — imports prisma, do not import in client components.
 */
export async function ensureUniqueSku(baseSku: string): Promise<string> {
  const existing = await prisma.inventoryItem.findMany({
    where: { sku: { startsWith: baseSku } },
    select: { sku: true },
  });

  if (existing.length === 0) return baseSku;

  const existingSkus = new Set(existing.map((i) => i.sku));
  if (!existingSkus.has(baseSku)) return baseSku;

  for (let suffix = 2; suffix <= 999; suffix++) {
    const candidate = `${baseSku}-${suffix}`;
    if (!existingSkus.has(candidate)) return candidate;
  }

  // Fallback: append timestamp
  return `${baseSku}-${Date.now()}`;
}
