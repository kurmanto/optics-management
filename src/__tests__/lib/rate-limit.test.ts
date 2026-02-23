import { describe, it, expect, beforeEach } from "vitest";

// Import directly (no mocking needed — this is a pure utility)
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Each test uses unique keys so they don't interfere
  });

  it("allows first request", () => {
    expect(checkRateLimit("test-key-1", 3, 60_000)).toBe(true);
  });

  it("allows up to max requests", () => {
    const key = "test-key-2-" + Date.now();
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it("blocks request when max exceeded", () => {
    const key = "test-key-3-" + Date.now();
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });

  it("uses different counters for different keys", () => {
    const keyA = "test-key-4a-" + Date.now();
    const keyB = "test-key-4b-" + Date.now();

    checkRateLimit(keyA, 1, 60_000);
    // keyA is now at limit
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(false);
    // keyB should still be allowed
    expect(checkRateLimit(keyB, 1, 60_000)).toBe(true);
  });
});
