import { describe, it, expect } from "vitest";
import { scoreFrame, type FrameData } from "@/lib/utils/frame-scoring";
import type { StyleChoice } from "@/lib/utils/style-quiz";

const baseChoices: StyleChoice = {
  shape: "ROUND",
  size: "OVERSIZED",
  material: "ACETATE",
  style: "BOLD",
  color: "WARM",
  vibe: "TRENDY",
};

// Use a cool color by default so WARM-preference tests don't get accidental neutral bonus
function makeFrame(overrides: Partial<FrameData> = {}): FrameData {
  return {
    material: null,
    styleTags: [],
    rimType: null,
    color: "Black", // COOL — mismatches WARM base preference → 0 color pts
    eyeSize: null,
    totalUnitsSold: 0,
    staffPickStyleLabels: [],
    ...overrides,
  };
}

describe("scoreFrame", () => {
  // ── Material match (20 pts) ──

  it("awards 20 pts for acetate match", () => {
    const frame = makeFrame({ material: "Acetate" });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(20);
    expect(result.matchReasons).toContain("Acetate lover");
  });

  it("awards 20 pts for metal match", () => {
    const choices = { ...baseChoices, material: "METAL" as const };
    const frame = makeFrame({ material: "Metal" });
    const result = scoreFrame(frame, choices, "Bold Trendsetter", 0);
    expect(result.score).toBe(20);
    expect(result.matchReasons).toContain("Metal fan");
  });

  it("awards 20 pts for titanium when user prefers metal", () => {
    const choices = { ...baseChoices, material: "METAL" as const };
    const frame = makeFrame({ material: "Titanium" });
    const result = scoreFrame(frame, choices, "Bold Trendsetter", 0);
    expect(result.score).toBe(20);
    expect(result.matchReasons).toContain("Metal fan");
  });

  it("gives 0 material pts when preference doesn't match", () => {
    const frame = makeFrame({ material: "Metal" });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(0);
    expect(result.matchReasons).not.toContain("Acetate lover");
    expect(result.matchReasons).not.toContain("Metal fan");
  });

  it("gives 0 material pts when frame has no material", () => {
    const frame = makeFrame({ material: null });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(0);
  });

  // ── Shape/style tag overlap (20 pts) ──

  it("awards style tag pts for matching shape tags", () => {
    const frame = makeFrame({ styleTags: ["round", "bold"] });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    // round matches ROUND preference, bold matches BOLD preference
    expect(result.score).toBeGreaterThanOrEqual(14);
    expect(result.matchReasons).toContain("Style match");
  });

  it("caps style tag score at 20", () => {
    const frame = makeFrame({ styleTags: ["round", "oval", "circular", "bold", "statement", "luxury", "modern", "trendy"] });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    // Many matches but capped at 20
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it("gives 0 tag pts when no tags overlap", () => {
    const frame = makeFrame({ styleTags: ["rectangular", "square"] });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.matchReasons).not.toContain("Style match");
  });

  // ── Rim type (15 pts) ──

  it("awards 15 pts for FULL_RIM when BOLD style", () => {
    const frame = makeFrame({ rimType: "FULL_RIM" });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(15);
    expect(result.matchReasons).toContain("Full rim for bold style");
  });

  it("awards 15 pts for HALF_RIM when MINIMAL style", () => {
    const choices = { ...baseChoices, style: "MINIMAL" as const };
    const frame = makeFrame({ rimType: "HALF_RIM" });
    const result = scoreFrame(frame, choices, "Modern Minimalist", 0);
    expect(result.score).toBe(15);
    expect(result.matchReasons).toContain("Minimal rim");
  });

  it("awards 15 pts for RIMLESS when MINIMAL style", () => {
    const choices = { ...baseChoices, style: "MINIMAL" as const };
    const frame = makeFrame({ rimType: "RIMLESS" });
    const result = scoreFrame(frame, choices, "Modern Minimalist", 0);
    expect(result.score).toBe(15);
    expect(result.matchReasons).toContain("Minimal rim");
  });

  it("gives 0 rim pts when rim doesn't match style", () => {
    const frame = makeFrame({ rimType: "RIMLESS" });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.matchReasons).not.toContain("Full rim for bold style");
    expect(result.matchReasons).not.toContain("Minimal rim");
  });

  // ── Color temperature (15 pts) ──

  it("awards 15 pts for warm color when WARM preference", () => {
    const frame = makeFrame({ color: "Tortoise" });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(15);
    expect(result.matchReasons).toContain("Warm tones");
  });

  it("awards 15 pts for cool color when COOL preference", () => {
    const choices = { ...baseChoices, color: "COOL" as const };
    const frame = makeFrame({ color: "Silver" });
    const result = scoreFrame(frame, choices, "Bold Trendsetter", 0);
    expect(result.score).toBe(15);
    expect(result.matchReasons).toContain("Cool tones");
  });

  it("awards 5 pts for neutral color (goes with everything)", () => {
    const frame = makeFrame({ color: "Green" }); // unrecognized → NEUTRAL
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(5);
  });

  it("awards 5 pts for null color (treated as NEUTRAL)", () => {
    const frame = makeFrame({ color: null });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(5);
  });

  // ── Size match (10 pts) ──

  it("awards 10 pts for oversized frame when OVERSIZED preference", () => {
    const frame = makeFrame({ eyeSize: 56 });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(10);
    expect(result.matchReasons).toContain("Oversized fit");
  });

  it("awards 10 pts for compact frame when COMPACT preference", () => {
    const choices = { ...baseChoices, size: "COMPACT" as const };
    const frame = makeFrame({ eyeSize: 50 });
    const result = scoreFrame(frame, choices, "Bold Trendsetter", 0);
    expect(result.score).toBe(10);
    expect(result.matchReasons).toContain("Compact fit");
  });

  it("gives 0 size pts when size doesn't match preference", () => {
    const frame = makeFrame({ eyeSize: 50 });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.matchReasons).not.toContain("Oversized fit");
  });

  it("gives 0 size pts when eyeSize is null", () => {
    const frame = makeFrame({ eyeSize: null });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.matchReasons).not.toContain("Oversized fit");
  });

  // ── Staff pick bonus (10 pts) ──

  it("awards 10 pts when frame is staff pick for matching label", () => {
    const frame = makeFrame({ staffPickStyleLabels: ["Bold Trendsetter"] });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(10);
    expect(result.matchReasons).toContain("Staff pick");
  });

  it("staff pick match is case-insensitive", () => {
    const frame = makeFrame({ staffPickStyleLabels: ["bold trendsetter"] });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(10);
    expect(result.matchReasons).toContain("Staff pick");
  });

  it("gives 0 staff pick pts when label doesn't match", () => {
    const frame = makeFrame({ staffPickStyleLabels: ["Modern Minimalist"] });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.matchReasons).not.toContain("Staff pick");
  });

  // ── Popularity (10 pts) ──

  it("awards popularity pts based on sales ratio", () => {
    const frame = makeFrame({ totalUnitsSold: 80 });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 100);
    expect(result.score).toBe(8); // 80/100 * 10 = 8
    expect(result.matchReasons).toContain("Popular choice");
  });

  it("gives 0 popularity pts when maxSold is 0", () => {
    const frame = makeFrame({ totalUnitsSold: 5 });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 0);
    expect(result.score).toBe(0);
  });

  it("does not add Popular choice reason for low popularity", () => {
    const frame = makeFrame({ totalUnitsSold: 3 });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 100);
    // 3/100 * 10 = 0.3 → rounds to 0, but still added to score
    expect(result.matchReasons).not.toContain("Popular choice");
  });

  // ── Combined scoring ──

  it("sums all dimensions for a perfect match", () => {
    const frame = makeFrame({
      material: "Acetate",
      styleTags: ["round", "bold", "modern"],
      rimType: "FULL_RIM",
      color: "Tortoise",
      eyeSize: 56,
      staffPickStyleLabels: ["Bold Trendsetter"],
      totalUnitsSold: 100,
    });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 100);
    // Material 20 + Tags 20 + Rim 15 + Color 15 + Size 10 + Staff 10 + Popularity 10 = 100
    expect(result.score).toBe(100);
    expect(result.matchReasons.length).toBeGreaterThanOrEqual(6);
  });

  it("returns 0 for completely mismatched frame", () => {
    const frame = makeFrame({
      material: "Metal",
      styleTags: ["rectangular"],
      rimType: "RIMLESS",
      color: "Black",
      eyeSize: 50,
      staffPickStyleLabels: [],
      totalUnitsSold: 0,
    });
    const result = scoreFrame(frame, baseChoices, "Bold Trendsetter", 100);
    expect(result.score).toBe(0);
    expect(result.matchReasons).toHaveLength(0);
  });
});
