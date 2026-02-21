import { prisma } from "@/lib/prisma";

interface SkuParts {
  brand?: string;
  model?: string;
  colorCode?: string;
  eyeSize?: string;
  bridge?: string;
}

/**
 * Generate a SKU from frame details.
 * Format: {BRAND}-{MODEL}-{COLORCODE}-{EYESIZE}-{BRIDGE}
 * Example: RAY-RB5154-2000-49-21
 */
export function generateSku(parts: SkuParts): string {
  const brandPrefix = (parts.brand || "UNK")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");

  const segments = [
    brandPrefix,
    (parts.model || "").toUpperCase().replace(/\s+/g, "") || undefined,
    (parts.colorCode || "").replace(/\s+/g, "") || undefined,
    (parts.eyeSize || "").replace(/\s+/g, "") || undefined,
    (parts.bridge || "").replace(/\s+/g, "") || undefined,
  ].filter(Boolean);

  return segments.join("-");
}

/**
 * Ensure the SKU is unique by appending -2, -3, etc. if collisions exist.
 * Requires DB access so call only from server actions.
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
