import { describe, it, expect, beforeEach, vi } from "vitest";

// We test the segment engine functions using the mocked prisma
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, ReturnType<typeof vi.fn>>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("previewSegmentCount", () => {
  it("returns 0 when $queryRawUnsafe returns empty array", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([{ count: 0 }]);

    const { previewSegmentCount } = await import("@/lib/campaigns/segment-engine");
    const count = await previewSegmentCount({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
    });

    expect(count).toBe(0);
  });

  it("returns the count from the query result", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([{ count: 42 }]);

    const { previewSegmentCount } = await import("@/lib/campaigns/segment-engine");
    const count = await previewSegmentCount({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
    });

    expect(count).toBe(42);
  });

  it("returns 0 when $queryRawUnsafe throws", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockRejectedValue(new Error("DB error"));

    const { previewSegmentCount } = await import("@/lib/campaigns/segment-engine");
    const count = await previewSegmentCount({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
    });

    expect(count).toBe(0);
  });
});

describe("previewSegmentSample", () => {
  it("returns sample rows from query", async () => {
    const prisma = await getPrisma();
    const sampleData = [
      { id: "c1", firstName: "Alice", lastName: "Smith", phone: "4165551111", email: null },
      { id: "c2", firstName: "Bob", lastName: "Jones", phone: null, email: "bob@example.com" },
    ];
    prisma.$queryRawUnsafe.mockResolvedValue(sampleData);

    const { previewSegmentSample } = await import("@/lib/campaigns/segment-engine");
    const sample = await previewSegmentSample({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
    });

    expect(sample).toHaveLength(2);
    expect(sample[0]).toMatchObject({ id: "c1", firstName: "Alice" });
  });

  it("returns empty array when query throws", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockRejectedValue(new Error("DB error"));

    const { previewSegmentSample } = await import("@/lib/campaigns/segment-engine");
    const sample = await previewSegmentSample({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
    });

    expect(sample).toEqual([]);
  });
});

describe("executeSegment", () => {
  it("returns customer IDs from query", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: "c1" }, { id: "c2" }, { id: "c3" }]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    const ids = await executeSegment({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
    });

    expect(ids).toEqual(["c1", "c2", "c3"]);
  });

  it("includes SMS filter when requireChannel=SMS", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
      requireChannel: "SMS",
    });

    const callArgs = prisma.$queryRawUnsafe.mock.calls[0];
    expect(callArgs[0]).toContain("smsOptIn");
  });

  it("includes EMAIL filter when requireChannel=EMAIL", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
      requireChannel: "EMAIL",
    });

    const callArgs = prisma.$queryRawUnsafe.mock.calls[0];
    expect(callArgs[0]).toContain("emailOptIn");
  });

  it("adds marketing_opt_out=false when excludeMarketingOptOut=true", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
    });

    const callArgs = prisma.$queryRawUnsafe.mock.calls[0];
    expect(callArgs[0]).toContain("marketing_opt_out");
  });
});

// ── SQL-building tests via executeSegment ─────────────────────────────────────

describe("segment SQL condition building", () => {
  it("age gt operator generates correct SQL", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [{ field: "age", operator: "gt", value: 40 }],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("EXTRACT(YEAR FROM AGE");
    expect(sql).toContain("> $1");
    expect(prisma.$queryRawUnsafe.mock.calls[0][1]).toBe(40);
  });

  it("lifetimeOrderCount gte operator", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [{ field: "lifetimeOrderCount", operator: "gte", value: 3 }],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("COUNT(*)");
    expect(sql).toContain(">= $1");
  });

  it("daysSinceLastExam between operator generates BETWEEN clause", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [{ field: "daysSinceLastExam", operator: "between", value: 300, value2: 400 }],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("BETWEEN $1 AND $2");
    const args = prisma.$queryRawUnsafe.mock.calls[0];
    expect(args[1]).toBe(300);
    expect(args[2]).toBe(400);
  });

  it("hasExam boolean true → EXISTS subquery", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [{ field: "hasExam", operator: "eq", value: true }],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("COUNT(*)::int FROM exams");
    expect(sql).not.toContain("NOT (");
  });

  it("hasExam boolean false → NOT EXISTS subquery", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [{ field: "hasExam", operator: "eq", value: false }],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("NOT (");
  });

  it("rxExpiresInDays between operator", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [{ field: "rxExpiresInDays", operator: "between", value: 30, value2: 90 }],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("prescriptions");
    expect(sql).toContain("BETWEEN $1 AND $2");
  });

  it("insuranceRenewalMonth in operator generates ANY clause", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [{ field: "insuranceRenewalMonth", operator: "in", value: [10, 11, 12] }],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("= ANY($1)");
    expect(prisma.$queryRawUnsafe.mock.calls[0][1]).toEqual([10, 11, 12]);
  });

  it("unknown field → passthrough 1=1", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [{ field: "unknownField" as never, operator: "eq", value: "x" }],
      excludeMarketingOptOut: false,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("1=1");
  });

  it("AND logic joins multiple conditions with AND", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [
        { field: "age", operator: "gt", value: 18 },
        { field: "lifetimeOrderCount", operator: "gte", value: 1 },
      ],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain(" AND ");
    // Both conditions should produce params
    expect(prisma.$queryRawUnsafe.mock.calls[0][1]).toBe(18);
    expect(prisma.$queryRawUnsafe.mock.calls[0][2]).toBe(1);
  });

  it("OR logic joins conditions with OR", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "OR",
      conditions: [
        { field: "age", operator: "lt", value: 30 },
        { field: "age", operator: "gt", value: 60 },
      ],
      excludeMarketingOptOut: true,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain(" OR ");
  });

  it("requireChannel SMS includes smsOptIn and phone checks", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
      requireChannel: "SMS",
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("smsOptIn");
    expect(sql).toContain("phone IS NOT NULL");
  });

  it("excludeRecentlyContacted adds NOT IN subquery", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { executeSegment } = await import("@/lib/campaigns/segment-engine");
    await executeSegment({
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
      excludeRecentlyContacted: 30,
    });

    const sql: string = prisma.$queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("NOT IN");
    expect(sql).toContain("messages");
    expect(sql).toContain("createdAt");
    // Value 30 should be the first param
    expect(prisma.$queryRawUnsafe.mock.calls[0][1]).toBe(30);
  });
});
