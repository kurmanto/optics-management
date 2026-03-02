import type { StyleChoice, StyleProfile } from "./style-quiz";

// ── Color classification ──────────────────────────────────────────────────

const WARM_COLORS = [
  "tortoise", "havana", "brown", "amber", "gold", "honey", "caramel", "tan",
  "copper", "bronze", "peach", "coral", "nude", "rose",
];
const COOL_COLORS = [
  "black", "silver", "grey", "gray", "blue", "navy", "gunmetal", "pewter",
  "charcoal", "slate", "midnight", "crystal", "clear", "transparent",
];

function classifyColor(color: string | null): "WARM" | "COOL" | "NEUTRAL" {
  if (!color) return "NEUTRAL";
  const lower = color.toLowerCase();
  if (WARM_COLORS.some((c) => lower.includes(c))) return "WARM";
  if (COOL_COLORS.some((c) => lower.includes(c))) return "COOL";
  return "NEUTRAL";
}

// ── Scoring ──────────────────────────────────────────────────────────────

export type FrameData = {
  material: string | null;
  styleTags: string[];
  rimType: string | null;
  color: string | null;
  eyeSize: number | null;
  totalUnitsSold: number;
  staffPickStyleLabels: string[];
};

export type ScoreResult = {
  score: number;
  matchReasons: string[];
};

export function scoreFrame(
  frame: FrameData,
  choices: StyleChoice,
  styleLabel: string,
  maxSold: number
): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Material match (20 pts)
  if (frame.material) {
    const frameMat = frame.material.toUpperCase();
    if (choices.material === "ACETATE" && frameMat.includes("ACETATE")) {
      score += 20;
      reasons.push("Acetate lover");
    } else if (choices.material === "METAL" && frameMat.includes("METAL")) {
      score += 20;
      reasons.push("Metal fan");
    } else if (frameMat.includes("TITANIUM") && choices.material === "METAL") {
      score += 20;
      reasons.push("Metal fan");
    }
  }

  // 2. Shape/style tag overlap (20 pts)
  if (frame.styleTags.length > 0) {
    const preferredTags: string[] = [];
    if (choices.shape === "ROUND") preferredTags.push("round", "oval", "circular");
    if (choices.shape === "ANGULAR") preferredTags.push("angular", "rectangular", "square", "geometric");
    if (choices.style === "BOLD") preferredTags.push("bold", "statement", "luxury");
    if (choices.style === "MINIMAL") preferredTags.push("minimal", "modern", "classic");
    if (choices.vibe === "CLASSIC") preferredTags.push("classic", "timeless");
    if (choices.vibe === "TRENDY") preferredTags.push("modern", "trendy", "bold");

    const matches = frame.styleTags.filter((tag) =>
      preferredTags.some((pt) => tag.toLowerCase().includes(pt))
    );
    if (matches.length > 0) {
      const tagScore = Math.min(20, matches.length * 7);
      score += tagScore;
      reasons.push("Style match");
    }
  }

  // 3. Rim type (15 pts)
  if (frame.rimType) {
    if (choices.style === "BOLD" && frame.rimType === "FULL_RIM") {
      score += 15;
      reasons.push("Full rim for bold style");
    } else if (
      choices.style === "MINIMAL" &&
      (frame.rimType === "HALF_RIM" || frame.rimType === "RIMLESS")
    ) {
      score += 15;
      reasons.push("Minimal rim");
    }
  }

  // 4. Color temperature (15 pts)
  const colorTemp = classifyColor(frame.color);
  if (colorTemp === choices.color) {
    score += 15;
    reasons.push(choices.color === "WARM" ? "Warm tones" : "Cool tones");
  } else if (colorTemp === "NEUTRAL") {
    score += 5; // Neutral goes with everything
  }

  // 5. Size match (10 pts)
  if (frame.eyeSize) {
    if (choices.size === "OVERSIZED" && frame.eyeSize >= 54) {
      score += 10;
      reasons.push("Oversized fit");
    } else if (choices.size === "COMPACT" && frame.eyeSize <= 52) {
      score += 10;
      reasons.push("Compact fit");
    }
  }

  // 6. Staff pick bonus (10 pts)
  if (
    frame.staffPickStyleLabels.length > 0 &&
    frame.staffPickStyleLabels.some(
      (l) => l.toLowerCase() === styleLabel.toLowerCase()
    )
  ) {
    score += 10;
    reasons.push("Staff pick");
  }

  // 7. Popularity (10 pts)
  if (maxSold > 0 && frame.totalUnitsSold > 0) {
    const popScore = Math.round((frame.totalUnitsSold / maxSold) * 10);
    score += popScore;
    if (popScore >= 7) {
      reasons.push("Popular choice");
    }
  }

  return { score, matchReasons: reasons };
}
