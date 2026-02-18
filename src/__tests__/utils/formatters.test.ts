import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatPhone,
  formatRxValue,
  generateOrderNumber,
  initials,
} from "@/lib/utils/formatters";

describe("formatCurrency", () => {
  it("formats a positive number as CAD currency", () => {
    const result = formatCurrency(99.99);
    expect(result).toContain("99.99");
    expect(result).toMatch(/CA\$|CAD|\$|99/);
  });

  it("returns $0.00 for zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0.00");
  });

  it("returns $0.00 for null", () => {
    expect(formatCurrency(null)).toBe("$0.00");
  });

  it("returns $0.00 for undefined", () => {
    expect(formatCurrency(undefined)).toBe("$0.00");
  });

  it("formats a negative number", () => {
    const result = formatCurrency(-50);
    expect(result).toContain("50");
    expect(result).toMatch(/-/);
  });
});

describe("formatDate", () => {
  it("formats a valid Date object", () => {
    const date = new Date("2025-06-15");
    const result = formatDate(date);
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/Jun/);
  });

  it("formats an ISO string", () => {
    // Use noon UTC to avoid timezone rollback to previous day
    const result = formatDate("2024-07-15T12:00:00Z");
    expect(result).toMatch(/2024/);
  });

  it("returns em dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("formatPhone", () => {
  it("formats a 10-digit number", () => {
    expect(formatPhone("6476485809")).toBe("(647) 648-5809");
  });

  it("formats a 11-digit number starting with 1", () => {
    expect(formatPhone("16476485809")).toBe("+1 (647) 648-5809");
  });

  it("strips non-digits before formatting", () => {
    expect(formatPhone("647-648-5809")).toBe("(647) 648-5809");
  });

  it("returns em dash for null", () => {
    expect(formatPhone(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatPhone(undefined)).toBe("—");
  });

  it("returns original string for unrecognized length", () => {
    const weirdPhone = "123456";
    expect(formatPhone(weirdPhone)).toBe("123456");
  });
});

describe("formatRxValue", () => {
  it("adds + prefix for positive value", () => {
    expect(formatRxValue(1.25)).toBe("+1.25");
  });

  it("uses - for negative value", () => {
    expect(formatRxValue(-2.5)).toBe("-2.50");
  });

  it("formats zero with + prefix (plano)", () => {
    expect(formatRxValue(0)).toBe("+0.00");
  });

  it("returns em dash for null", () => {
    expect(formatRxValue(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatRxValue(undefined)).toBe("—");
  });
});

describe("generateOrderNumber", () => {
  it("matches ORD-YYYY-NNNN format", () => {
    const result = generateOrderNumber();
    expect(result).toMatch(/^ORD-\d{4}-\d{4}$/);
  });

  it("includes the current year", () => {
    const result = generateOrderNumber();
    const currentYear = new Date().getFullYear().toString();
    expect(result).toContain(currentYear);
  });

  it("generates different values on repeated calls (probabilistic)", () => {
    const results = new Set(Array.from({ length: 20 }, generateOrderNumber));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("initials", () => {
  it("returns first letter of single name", () => {
    expect(initials("John")).toBe("J");
  });

  it("returns first letters of first and last name", () => {
    expect(initials("John Smith")).toBe("JS");
  });

  it("returns only 2 characters for 3+ word names", () => {
    expect(initials("John Michael Smith")).toBe("JM");
  });

  it("returns uppercase", () => {
    expect(initials("alice bob")).toBe("AB");
  });

  it("returns empty string for an empty name", () => {
    // "".split(" ") → [""] → map(n => n[0]) → [undefined] → join("") → ""
    expect(initials("")).toBe("");
  });
});
