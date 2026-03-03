import { describe, it, expect } from "vitest";
import {
  computeRecommendation,
  LENS_PACKAGES,
  type QuizAnswers,
} from "@/lib/utils/lens-packages";

const baseAnswers: QuizAnswers = {
  primaryUse: "WORK_SCREENS",
  wearTime: "MODERATE",
  frustration: "NO_ISSUES",
  currentGlasses: "YES_SINGLE",
  sunglasses: "NOT_NOW",
  hasBenefits: "NO",
};

describe("LENS_PACKAGES", () => {
  it("has 6 packages total — 3 SV + 3 progressive", () => {
    expect(LENS_PACKAGES).toHaveLength(6);
    expect(LENS_PACKAGES.filter((p) => p.type === "SINGLE_VISION")).toHaveLength(3);
    expect(LENS_PACKAGES.filter((p) => p.type === "PROGRESSIVE")).toHaveLength(3);
  });

  it("each package has unique id", () => {
    const ids = LENS_PACKAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("price ranges are ascending by tier within each type", () => {
    for (const type of ["SINGLE_VISION", "PROGRESSIVE"] as const) {
      const pkgs = LENS_PACKAGES.filter((p) => p.type === type);
      for (let i = 1; i < pkgs.length; i++) {
        expect(pkgs[i].priceMin).toBeGreaterThan(pkgs[i - 1].priceMin);
      }
    }
  });
});

describe("computeRecommendation — lens type detection", () => {
  it("returns PROGRESSIVE when currentGlasses is YES_PROGRESSIVE", () => {
    const result = computeRecommendation({ ...baseAnswers, currentGlasses: "YES_PROGRESSIVE" });
    expect(result.primary.type).toBe("PROGRESSIVE");
  });

  it("returns SINGLE_VISION when currentGlasses is YES_SINGLE", () => {
    const result = computeRecommendation({ ...baseAnswers, currentGlasses: "YES_SINGLE" });
    expect(result.primary.type).toBe("SINGLE_VISION");
  });

  it("returns SINGLE_VISION when currentGlasses is NO_GLASSES", () => {
    const result = computeRecommendation({ ...baseAnswers, currentGlasses: "NO_GLASSES" });
    expect(result.primary.type).toBe("SINGLE_VISION");
  });
});

describe("computeRecommendation — tier scoring", () => {
  it("low engagement → STANDARD tier (score 0-2)", () => {
    const answers: QuizAnswers = {
      primaryUse: "READING",
      wearTime: "LIGHT",
      frustration: "NO_ISSUES",
      currentGlasses: "YES_SINGLE",
      sunglasses: "NOT_NOW",
      hasBenefits: "NO",
    };
    const result = computeRecommendation(answers);
    expect(result.primary.tier).toBe("STANDARD");
    expect(result.tierScore).toBeLessThanOrEqual(2);
  });

  it("moderate engagement → PREMIUM tier (score 3-4)", () => {
    const answers: QuizAnswers = {
      primaryUse: "WORK_SCREENS",
      wearTime: "HEAVY",
      frustration: "NO_ISSUES",
      currentGlasses: "YES_SINGLE",
      sunglasses: "NOT_NOW",
      hasBenefits: "NO",
    };
    // WORK_SCREENS=1 + HEAVY=2 + NO_ISSUES=0 + NO=0 = 3
    const result = computeRecommendation(answers);
    expect(result.primary.tier).toBe("PREMIUM");
    expect(result.tierScore).toBeGreaterThanOrEqual(3);
    expect(result.tierScore).toBeLessThanOrEqual(4);
  });

  it("high engagement → ELITE tier (score 5+)", () => {
    const answers: QuizAnswers = {
      primaryUse: "ALL_DAY",
      wearTime: "HEAVY",
      frustration: "NEVER_RIGHT",
      currentGlasses: "YES_SINGLE",
      sunglasses: "NOT_NOW",
      hasBenefits: "YES",
    };
    // ALL_DAY=2 + HEAVY=2 + NEVER_RIGHT=2 + YES=1 = 7
    const result = computeRecommendation(answers);
    expect(result.primary.tier).toBe("ELITE");
    expect(result.tierScore).toBeGreaterThanOrEqual(5);
  });

  it("benefits add 1 point", () => {
    const withoutBenefits: QuizAnswers = {
      primaryUse: "DRIVING",
      wearTime: "MODERATE",
      frustration: "HEADACHES",
      currentGlasses: "YES_SINGLE",
      sunglasses: "NOT_NOW",
      hasBenefits: "NO",
    };
    const withBenefits = { ...withoutBenefits, hasBenefits: "YES" as const };
    const scoreWithout = computeRecommendation(withoutBenefits).tierScore;
    const scoreWith = computeRecommendation(withBenefits).tierScore;
    expect(scoreWith).toBe(scoreWithout + 1);
  });
});

describe("computeRecommendation — upgrade/alternative", () => {
  it("STANDARD has upgrade but no alternative", () => {
    const result = computeRecommendation({
      ...baseAnswers,
      primaryUse: "READING",
      wearTime: "LIGHT",
      frustration: "NO_ISSUES",
      hasBenefits: "NO",
    });
    expect(result.primary.tier).toBe("STANDARD");
    expect(result.upgrade).not.toBeNull();
    expect(result.upgrade!.tier).toBe("PREMIUM");
    expect(result.alternative).toBeNull();
  });

  it("ELITE has alternative but no upgrade", () => {
    const result = computeRecommendation({
      ...baseAnswers,
      primaryUse: "ALL_DAY",
      wearTime: "HEAVY",
      frustration: "NEVER_RIGHT",
      hasBenefits: "YES",
    });
    expect(result.primary.tier).toBe("ELITE");
    expect(result.upgrade).toBeNull();
    expect(result.alternative).not.toBeNull();
    expect(result.alternative!.tier).toBe("PREMIUM");
  });

  it("PREMIUM has both upgrade and alternative", () => {
    const result = computeRecommendation({
      ...baseAnswers,
      primaryUse: "WORK_SCREENS",
      wearTime: "HEAVY",
      frustration: "NO_ISSUES",
      hasBenefits: "NO",
    });
    expect(result.primary.tier).toBe("PREMIUM");
    expect(result.upgrade).not.toBeNull();
    expect(result.upgrade!.tier).toBe("ELITE");
    expect(result.alternative).not.toBeNull();
    expect(result.alternative!.tier).toBe("STANDARD");
  });

  it("upgrade/alternative match same lens type", () => {
    const progressive = computeRecommendation({
      ...baseAnswers,
      currentGlasses: "YES_PROGRESSIVE",
      primaryUse: "WORK_SCREENS",
      wearTime: "HEAVY",
    });
    expect(progressive.primary.type).toBe("PROGRESSIVE");
    if (progressive.upgrade) expect(progressive.upgrade.type).toBe("PROGRESSIVE");
    if (progressive.alternative) expect(progressive.alternative.type).toBe("PROGRESSIVE");
  });
});

describe("computeRecommendation — whyBullets", () => {
  it("returns at least 1 bullet for any answer set", () => {
    const result = computeRecommendation(baseAnswers);
    expect(result.whyBullets.length).toBeGreaterThanOrEqual(1);
  });

  it("includes screen-specific bullet for WORK_SCREENS", () => {
    const result = computeRecommendation({ ...baseAnswers, primaryUse: "WORK_SCREENS" });
    expect(result.whyBullets.some((b) => b.toLowerCase().includes("screen"))).toBe(true);
  });

  it("includes progressive bullet for progressive lenses", () => {
    const result = computeRecommendation({ ...baseAnswers, currentGlasses: "YES_PROGRESSIVE" });
    expect(result.whyBullets.some((b) => b.toLowerCase().includes("transition"))).toBe(true);
  });

  it("includes insurance bullet when hasBenefits is YES", () => {
    const result = computeRecommendation({ ...baseAnswers, hasBenefits: "YES" });
    expect(result.whyBullets.some((b) => b.toLowerCase().includes("insurance"))).toBe(true);
  });
});

describe("computeRecommendation — sunglassesNote", () => {
  it("returns prescription note for YES_PRESCRIPTION", () => {
    const result = computeRecommendation({ ...baseAnswers, sunglasses: "YES_PRESCRIPTION" });
    expect(result.sunglassesNote).toContain("prescription sunglasses");
  });

  it("returns clip-on note for YES_CLIP", () => {
    const result = computeRecommendation({ ...baseAnswers, sunglasses: "YES_CLIP" });
    expect(result.sunglassesNote).toContain("Clip-on");
  });

  it("returns empty string for NOT_NOW", () => {
    const result = computeRecommendation({ ...baseAnswers, sunglasses: "NOT_NOW" });
    expect(result.sunglassesNote).toBe("");
  });
});
