import { describe, it, expect } from "vitest";
import {
  computeStyleLabel,
  getStyleTraits,
  buildFrameMatchFilters,
  buildBroadenedFilters,
  QUIZ_ROUNDS,
  type StyleChoice,
} from "@/lib/utils/style-quiz";

describe("computeStyleLabel", () => {
  it("returns Bold Trendsetter for BOLD/TRENDY/ROUND", () => {
    const choices: StyleChoice = { shape: "ROUND", size: "OVERSIZED", material: "ACETATE", style: "BOLD", color: "WARM", vibe: "TRENDY" };
    expect(computeStyleLabel(choices)).toBe("Bold Trendsetter");
  });

  it("returns Power Classic for BOLD/CLASSIC/ANGULAR", () => {
    const choices: StyleChoice = { shape: "ANGULAR", size: "COMPACT", material: "METAL", style: "BOLD", color: "COOL", vibe: "CLASSIC" };
    expect(computeStyleLabel(choices)).toBe("Power Classic");
  });

  it("returns Refined Professional for MINIMAL/CLASSIC/ANGULAR", () => {
    const choices: StyleChoice = { shape: "ANGULAR", size: "COMPACT", material: "METAL", style: "MINIMAL", color: "COOL", vibe: "CLASSIC" };
    expect(computeStyleLabel(choices)).toBe("Refined Professional");
  });

  it("returns Understated Elegance for MINIMAL/CLASSIC/ROUND", () => {
    const choices: StyleChoice = { shape: "ROUND", size: "COMPACT", material: "METAL", style: "MINIMAL", color: "COOL", vibe: "CLASSIC" };
    expect(computeStyleLabel(choices)).toBe("Understated Elegance");
  });

  it("returns Modern Minimalist for MINIMAL/TRENDY/ROUND", () => {
    const choices: StyleChoice = { shape: "ROUND", size: "OVERSIZED", material: "ACETATE", style: "MINIMAL", color: "WARM", vibe: "TRENDY" };
    expect(computeStyleLabel(choices)).toBe("Modern Minimalist");
  });

  it("returns Clean Contemporary for MINIMAL/TRENDY/ANGULAR", () => {
    const choices: StyleChoice = { shape: "ANGULAR", size: "COMPACT", material: "METAL", style: "MINIMAL", color: "COOL", vibe: "TRENDY" };
    expect(computeStyleLabel(choices)).toBe("Clean Contemporary");
  });

  it("returns Retro Statement for BOLD/TRENDY/ANGULAR", () => {
    const choices: StyleChoice = { shape: "ANGULAR", size: "OVERSIZED", material: "ACETATE", style: "BOLD", color: "WARM", vibe: "TRENDY" };
    expect(computeStyleLabel(choices)).toBe("Retro Statement");
  });

  it("returns Retro Statement for BOLD/CLASSIC/ROUND", () => {
    const choices: StyleChoice = { shape: "ROUND", size: "OVERSIZED", material: "ACETATE", style: "BOLD", color: "WARM", vibe: "CLASSIC" };
    expect(computeStyleLabel(choices)).toBe("Retro Statement");
  });
});

describe("getStyleTraits", () => {
  it("returns 6 trait strings based on choices", () => {
    const choices: StyleChoice = { shape: "ROUND", size: "OVERSIZED", material: "ACETATE", style: "BOLD", color: "WARM", vibe: "TRENDY" };
    const traits = getStyleTraits(choices);
    expect(traits).toHaveLength(6);
    expect(traits).toContain("Curved shapes");
    expect(traits).toContain("Oversized fit");
    expect(traits).toContain("Acetate lover");
    expect(traits).toContain("Statement maker");
    expect(traits).toContain("Warm palette");
    expect(traits).toContain("Trend-forward");
  });

  it("returns opposite traits for opposite choices", () => {
    const choices: StyleChoice = { shape: "ANGULAR", size: "COMPACT", material: "METAL", style: "MINIMAL", color: "COOL", vibe: "CLASSIC" };
    const traits = getStyleTraits(choices);
    expect(traits).toContain("Angular shapes");
    expect(traits).toContain("Compact fit");
    expect(traits).toContain("Metal fan");
    expect(traits).toContain("Subtle dresser");
    expect(traits).toContain("Cool palette");
    expect(traits).toContain("Timeless taste");
  });
});

describe("buildFrameMatchFilters", () => {
  it("builds filters with round/acetate/bold choices", () => {
    const choices: StyleChoice = { shape: "ROUND", size: "OVERSIZED", material: "ACETATE", style: "BOLD", color: "WARM", vibe: "TRENDY" };
    const filters = buildFrameMatchFilters(choices);
    expect(filters.isActive).toBe(true);
    expect(filters.stockQuantity).toEqual({ gt: 0 });
    expect(filters.styleTags).toEqual({ hasSome: ["round", "oval", "circular", "cat-eye"] });
    expect(filters.material).toEqual({ contains: "acetate", mode: "insensitive" });
    expect(filters.rimType).toEqual({ in: ["FULL_RIM"] });
  });

  it("builds filters with angular/metal/minimal choices", () => {
    const choices: StyleChoice = { shape: "ANGULAR", size: "COMPACT", material: "METAL", style: "MINIMAL", color: "COOL", vibe: "CLASSIC" };
    const filters = buildFrameMatchFilters(choices);
    expect(filters.styleTags).toEqual({ hasSome: ["rectangular", "square", "geometric", "aviator"] });
    expect(filters.material).toEqual({ contains: "metal", mode: "insensitive" });
    expect(filters.rimType).toEqual({ in: ["HALF_RIM", "RIMLESS"] });
  });
});

describe("buildBroadenedFilters", () => {
  it("only filters by material, active, and stock", () => {
    const choices: StyleChoice = { shape: "ROUND", size: "OVERSIZED", material: "ACETATE", style: "BOLD", color: "WARM", vibe: "TRENDY" };
    const filters = buildBroadenedFilters(choices);
    expect(filters.isActive).toBe(true);
    expect(filters.stockQuantity).toEqual({ gt: 0 });
    expect(filters.material).toEqual({ contains: "acetate", mode: "insensitive" });
    expect(filters).not.toHaveProperty("styleTags");
    expect(filters).not.toHaveProperty("rimType");
  });
});

describe("QUIZ_ROUNDS", () => {
  it("has exactly 6 rounds", () => {
    expect(QUIZ_ROUNDS).toHaveLength(6);
  });

  it("covers all dimensions", () => {
    const dimensions = QUIZ_ROUNDS.map((r) => r.dimension);
    expect(dimensions).toEqual(["shape", "size", "material", "style", "color", "vibe"]);
  });

  it("each round has valid structure", () => {
    for (const round of QUIZ_ROUNDS) {
      expect(round.question).toBeTruthy();
      expect(round.optionA.value).toBeTruthy();
      expect(round.optionA.label).toBeTruthy();
      expect(round.optionA.image).toMatch(/^\/style-quiz\//);
      expect(round.optionB.value).toBeTruthy();
      expect(round.optionB.label).toBeTruthy();
      expect(round.optionB.image).toMatch(/^\/style-quiz\//);
    }
  });
});
