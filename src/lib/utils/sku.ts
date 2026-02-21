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
 *
 * Pure utility — no server imports, safe to use in client components.
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
