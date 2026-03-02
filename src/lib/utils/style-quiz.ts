// Style ID Quiz — pure functions for label computation, quiz rounds, and frame match filters

export type StyleChoice = {
  shape: "ROUND" | "ANGULAR";
  size: "OVERSIZED" | "COMPACT";
  material: "ACETATE" | "METAL";
  style: "BOLD" | "MINIMAL";
  color: "WARM" | "COOL";
  vibe: "CLASSIC" | "TRENDY";
};

export type StyleProfile = {
  completedAt: string;
  label: string;
  choices: StyleChoice;
};

export type QuizRound = {
  dimension: keyof StyleChoice;
  question: string;
  optionA: { value: string; label: string; description: string; image: string };
  optionB: { value: string; label: string; description: string; image: string };
};

export const QUIZ_ROUNDS: QuizRound[] = [
  {
    dimension: "shape",
    question: "Which frame shape speaks to you?",
    optionA: { value: "ROUND", label: "Round", description: "Soft, curved lines", image: "/style-quiz/round-frame.svg" },
    optionB: { value: "ANGULAR", label: "Angular", description: "Sharp, geometric edges", image: "/style-quiz/angular-frame.svg" },
  },
  {
    dimension: "size",
    question: "What size fits your style?",
    optionA: { value: "OVERSIZED", label: "Oversized", description: "Big, bold presence", image: "/style-quiz/oversized-frame.svg" },
    optionB: { value: "COMPACT", label: "Compact", description: "Sleek, understated fit", image: "/style-quiz/compact-frame.svg" },
  },
  {
    dimension: "material",
    question: "Which material do you prefer?",
    optionA: { value: "ACETATE", label: "Acetate", description: "Rich colors, solid weight", image: "/style-quiz/acetate-frame.svg" },
    optionB: { value: "METAL", label: "Metal", description: "Thin, lightweight, airy", image: "/style-quiz/metal-frame.svg" },
  },
  {
    dimension: "style",
    question: "How much should your frames stand out?",
    optionA: { value: "BOLD", label: "Bold & Statement", description: "Turn heads, make an impression", image: "/style-quiz/bold-frame.svg" },
    optionB: { value: "MINIMAL", label: "Minimal & Subtle", description: "Clean look, no fuss", image: "/style-quiz/minimal-frame.svg" },
  },
  {
    dimension: "color",
    question: "Which colour palette draws you in?",
    optionA: { value: "WARM", label: "Warm Tones", description: "Tortoise, gold, brown, amber", image: "/style-quiz/warm-tones.svg" },
    optionB: { value: "COOL", label: "Cool Tones", description: "Black, silver, blue, grey", image: "/style-quiz/cool-tones.svg" },
  },
  {
    dimension: "vibe",
    question: "What vibe do you go for?",
    optionA: { value: "CLASSIC", label: "Classic & Timeless", description: "Never goes out of style", image: "/style-quiz/classic-vibe.svg" },
    optionB: { value: "TRENDY", label: "Trendy & Fashion-forward", description: "On the pulse, always fresh", image: "/style-quiz/trendy-vibe.svg" },
  },
];

// ── Style label computation ─────────────────────────────────────────────────

type LabelKey = `${StyleChoice["style"]}_${StyleChoice["vibe"]}_${StyleChoice["shape"]}`;

const LABEL_MAP: Record<LabelKey, string> = {
  BOLD_TRENDY_ROUND: "Bold Trendsetter",
  BOLD_TRENDY_ANGULAR: "Retro Statement",
  BOLD_CLASSIC_ROUND: "Retro Statement",
  BOLD_CLASSIC_ANGULAR: "Power Classic",
  MINIMAL_CLASSIC_ANGULAR: "Refined Professional",
  MINIMAL_CLASSIC_ROUND: "Understated Elegance",
  MINIMAL_TRENDY_ROUND: "Modern Minimalist",
  MINIMAL_TRENDY_ANGULAR: "Clean Contemporary",
};

export function computeStyleLabel(choices: StyleChoice): string {
  const key: LabelKey = `${choices.style}_${choices.vibe}_${choices.shape}`;
  return LABEL_MAP[key] || "Style Explorer";
}

// ── Style traits for display ────────────────────────────────────────────────

export function getStyleTraits(choices: StyleChoice): string[] {
  const traits: string[] = [];
  traits.push(choices.shape === "ROUND" ? "Curved shapes" : "Angular shapes");
  traits.push(choices.size === "OVERSIZED" ? "Oversized fit" : "Compact fit");
  traits.push(choices.material === "ACETATE" ? "Acetate lover" : "Metal fan");
  traits.push(choices.style === "BOLD" ? "Statement maker" : "Subtle dresser");
  traits.push(choices.color === "WARM" ? "Warm palette" : "Cool palette");
  traits.push(choices.vibe === "CLASSIC" ? "Timeless taste" : "Trend-forward");
  return traits;
}

// ── Frame match filter builder ──────────────────────────────────────────────

type FrameFilter = {
  material?: { contains: string; mode: "insensitive" };
  rimType?: { in: string[] };
  styleTags?: { hasSome: string[] };
  isActive: true;
  stockQuantity?: { gt: number };
};

const SHAPE_TAGS: Record<StyleChoice["shape"], string[]> = {
  ROUND: ["round", "oval", "circular", "cat-eye"],
  ANGULAR: ["rectangular", "square", "geometric", "aviator"],
};

const RIM_MAP: Record<StyleChoice["style"], string[]> = {
  BOLD: ["FULL_RIM"],
  MINIMAL: ["HALF_RIM", "RIMLESS"],
};

export function buildFrameMatchFilters(choices: StyleChoice): FrameFilter {
  return {
    isActive: true,
    stockQuantity: { gt: 0 },
    styleTags: { hasSome: SHAPE_TAGS[choices.shape] },
    material: { contains: choices.material.toLowerCase(), mode: "insensitive" },
    rimType: { in: RIM_MAP[choices.style] },
  };
}

export function buildBroadenedFilters(choices: StyleChoice): FrameFilter {
  // Broader fallback: only filter by material + active + in stock
  return {
    isActive: true,
    stockQuantity: { gt: 0 },
    material: { contains: choices.material.toLowerCase(), mode: "insensitive" },
  };
}
