// ─── Lens Package Definitions & Decision Engine ─────────────────────────────
// Pure functions — no DB or server dependencies.

export type LensType = "SINGLE_VISION" | "PROGRESSIVE";
export type LensTier = "STANDARD" | "PREMIUM" | "ELITE";

export interface LensPackage {
  id: string;
  name: string;
  type: LensType;
  tier: LensTier;
  priceMin: number;
  priceMax: number;
  tagline: string;
  features: string[];
}

export const LENS_PACKAGES: LensPackage[] = [
  {
    id: "SV_STANDARD",
    name: "Clear View Essentials",
    type: "SINGLE_VISION",
    tier: "STANDARD",
    priceMin: 150,
    priceMax: 250,
    tagline: "Quality everyday lenses for clear, comfortable vision",
    features: [
      "Anti-reflective coating",
      "Scratch-resistant",
      "UV protection",
    ],
  },
  {
    id: "SV_PREMIUM",
    name: "Digital Comfort",
    type: "SINGLE_VISION",
    tier: "PREMIUM",
    priceMin: 275,
    priceMax: 400,
    tagline: "Enhanced lenses designed for modern screen-heavy lifestyles",
    features: [
      "Blue-light filtering",
      "Reduced digital eye strain",
      "Premium anti-reflective coating",
      "Thinner & lighter lens material",
    ],
  },
  {
    id: "SV_ELITE",
    name: "Precision HD",
    type: "SINGLE_VISION",
    tier: "ELITE",
    priceMin: 425,
    priceMax: 575,
    tagline: "The sharpest single-vision lens technology available",
    features: [
      "Digitally surfaced for your exact prescription",
      "Widest clear field of vision",
      "Superior blue-light protection",
      "Ultra-thin high-index material",
      "Smudge-proof hydrophobic coating",
    ],
  },
  {
    id: "PROG_STANDARD",
    name: "Smooth Transition",
    type: "PROGRESSIVE",
    tier: "STANDARD",
    priceMin: 350,
    priceMax: 475,
    tagline: "Seamless near-to-far vision in one pair",
    features: [
      "No visible bifocal line",
      "Anti-reflective coating",
      "UV protection",
    ],
  },
  {
    id: "PROG_PREMIUM",
    name: "Adaptive Vision Pro",
    type: "PROGRESSIVE",
    tier: "PREMIUM",
    priceMin: 500,
    priceMax: 675,
    tagline: "Wider reading zones and smoother transitions for active lifestyles",
    features: [
      "Wider intermediate & reading zones",
      "Reduced peripheral swim",
      "Blue-light filtering",
      "Thinner & lighter material",
    ],
  },
  {
    id: "PROG_ELITE",
    name: "TrueView Elite",
    type: "PROGRESSIVE",
    tier: "ELITE",
    priceMin: 700,
    priceMax: 950,
    tagline: "The most advanced progressive lens — precision-crafted for you",
    features: [
      "Custom-built to your exact measurements",
      "Widest possible reading corridor",
      "Near-zero peripheral distortion",
      "Premium blue-light & UV protection",
      "Ultra-thin high-index material",
    ],
  },
];

// ─── Quiz Answer Types ──────────────────────────────────────────────────────

export type PrimaryUse = "ALL_DAY" | "WORK_SCREENS" | "DRIVING" | "READING" | "SPORTS";
export type WearTime = "HEAVY" | "MODERATE" | "LIGHT";
export type Frustration = "NEVER_RIGHT" | "HEADACHES" | "BLURRY_EDGES" | "HEAVY_THICK" | "NO_ISSUES";
export type CurrentGlasses = "YES_PROGRESSIVE" | "YES_SINGLE" | "NO_GLASSES";
export type SunglassesInterest = "YES_PRESCRIPTION" | "YES_CLIP" | "NOT_NOW";
export type HasBenefits = "YES" | "NOT_SURE" | "NO";

export interface QuizAnswers {
  primaryUse: PrimaryUse;
  wearTime: WearTime;
  frustration: Frustration;
  currentGlasses: CurrentGlasses;
  sunglasses: SunglassesInterest;
  hasBenefits: HasBenefits;
}

// ─── Decision Engine ────────────────────────────────────────────────────────

function determineLensType(answers: QuizAnswers): LensType {
  return answers.currentGlasses === "YES_PROGRESSIVE" ? "PROGRESSIVE" : "SINGLE_VISION";
}

function computeTierScore(answers: QuizAnswers): number {
  let score = 0;

  // Wear time
  if (answers.wearTime === "HEAVY") score += 2;
  else if (answers.wearTime === "MODERATE") score += 1;

  // Primary use
  if (answers.primaryUse === "ALL_DAY") score += 2;
  else if (answers.primaryUse === "WORK_SCREENS") score += 1;

  // Frustration
  if (answers.frustration === "NEVER_RIGHT") score += 2;
  else if (answers.frustration !== "NO_ISSUES") score += 1;

  // Benefits
  if (answers.hasBenefits === "YES") score += 1;

  return score;
}

function scoreToTier(score: number): LensTier {
  if (score >= 5) return "ELITE";
  if (score >= 3) return "PREMIUM";
  return "STANDARD";
}

const TIER_ORDER: LensTier[] = ["STANDARD", "PREMIUM", "ELITE"];

function getPackage(type: LensType, tier: LensTier): LensPackage {
  const pkg = LENS_PACKAGES.find((p) => p.type === type && p.tier === tier);
  if (!pkg) throw new Error(`No package for ${type}/${tier}`);
  return pkg;
}

export interface Recommendation {
  primary: LensPackage;
  upgrade: LensPackage | null;
  alternative: LensPackage | null;
  whyBullets: string[];
  sunglassesNote: string;
  tierScore: number;
}

// ─── "Why this fits you" bullet templates ────────────────────────────────────

function buildWhyBullets(answers: QuizAnswers, primary: LensPackage): string[] {
  const bullets: string[] = [];

  // Primary use bullets
  if (answers.primaryUse === "ALL_DAY") {
    bullets.push("Built for all-day comfort — morning to night.");
  } else if (answers.primaryUse === "WORK_SCREENS") {
    bullets.push("Optimized for screen work and digital devices.");
  } else if (answers.primaryUse === "DRIVING") {
    bullets.push("Enhanced clarity for driving and distance tasks.");
  } else if (answers.primaryUse === "READING") {
    bullets.push("Tuned for comfortable, extended reading sessions.");
  } else if (answers.primaryUse === "SPORTS") {
    bullets.push("Durable and clear for active lifestyles.");
  }

  // Wear time bullets
  if (answers.wearTime === "HEAVY") {
    bullets.push("Premium coatings reduce fatigue during 7+ hours of daily wear.");
  } else if (answers.wearTime === "MODERATE") {
    bullets.push("Comfortable for your regular daily wear schedule.");
  }

  // Frustration bullets
  if (answers.frustration === "NEVER_RIGHT") {
    bullets.push("Higher-precision lens design addresses past fitting issues.");
  } else if (answers.frustration === "HEADACHES") {
    bullets.push("Better optics help reduce eye strain and headaches.");
  } else if (answers.frustration === "BLURRY_EDGES") {
    bullets.push("Wider clear zones minimize peripheral blur.");
  } else if (answers.frustration === "HEAVY_THICK") {
    bullets.push("Thinner, lighter materials for a more comfortable fit.");
  }

  // Progressive-specific
  if (primary.type === "PROGRESSIVE") {
    bullets.push("Smooth near-to-far transitions — no bifocal line.");
  }

  // Benefits bullet
  if (answers.hasBenefits === "YES") {
    bullets.push("Your insurance benefits can offset a significant portion of the cost.");
  }

  return bullets;
}

function buildSunglassesNote(answers: QuizAnswers): string {
  if (answers.sunglasses === "YES_PRESCRIPTION") {
    return "Great news — we can build prescription sunglasses with the same lens technology as your everyday pair. Ask about our sun lens packages during your consult.";
  }
  if (answers.sunglasses === "YES_CLIP") {
    return "Clip-on and magnetic sun options are available for many frames. We'll show you compatible choices during your visit.";
  }
  return "";
}

// ─── Main function ──────────────────────────────────────────────────────────

export function computeRecommendation(answers: QuizAnswers): Recommendation {
  const lensType = determineLensType(answers);
  const tierScore = computeTierScore(answers);
  const tier = scoreToTier(tierScore);

  const primary = getPackage(lensType, tier);

  const tierIdx = TIER_ORDER.indexOf(tier);
  const upgrade = tierIdx < TIER_ORDER.length - 1
    ? getPackage(lensType, TIER_ORDER[tierIdx + 1])
    : null;
  const alternative = tierIdx > 0
    ? getPackage(lensType, TIER_ORDER[tierIdx - 1])
    : null;

  const whyBullets = buildWhyBullets(answers, primary);
  const sunglassesNote = buildSunglassesNote(answers);

  return {
    primary,
    upgrade,
    alternative,
    whyBullets,
    sunglassesNote,
    tierScore,
  };
}
