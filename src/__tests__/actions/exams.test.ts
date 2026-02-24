import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

describe("createExam", () => {
  it("returns error when customerId is missing", async () => {
    const { createExam } = await import("@/lib/actions/exams");
    const result = await createExam({
      customerId: "",
      examDate: "2026-02-24",
      examType: "COMPREHENSIVE",
    });
    expect(result.error).toBeDefined();
  });

  it("returns error when examDate is missing", async () => {
    const { createExam } = await import("@/lib/actions/exams");
    const result = await createExam({
      customerId: "cust-1",
      examDate: "",
      examType: "COMPREHENSIVE",
    });
    expect(result.error).toBeDefined();
  });

  it("creates exam with correct data on success", async () => {
    const prisma = await getPrisma();
    prisma.exam.create.mockResolvedValue({ id: "exam-1" });

    const { createExam } = await import("@/lib/actions/exams");
    const result = await createExam({
      customerId: "cust-1",
      examDate: "2026-02-24",
      examType: "COMPREHENSIVE",
      doctorName: "Dr. Smith",
      paymentMethod: "INSURANCE",
      amountBilled: 100,
      amountPaid: 80,
      ohipCovered: true,
    });

    expect(result.success).toBe(true);
    expect(prisma.exam.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: "cust-1",
          examType: "COMPREHENSIVE",
          doctorName: "Dr. Smith",
          paymentMethod: "INSURANCE",
          amountBilled: 100,
          amountPaid: 80,
          ohipCovered: true,
        }),
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.exam.create.mockRejectedValue(new Error("DB error"));

    const { createExam } = await import("@/lib/actions/exams");
    const result = await createExam({
      customerId: "cust-1",
      examDate: "2026-02-24",
      examType: "COMPREHENSIVE",
    });
    expect(result.error).toBeDefined();
  });

  it("sets paymentMethod to null when not provided", async () => {
    const prisma = await getPrisma();
    prisma.exam.create.mockResolvedValue({ id: "exam-2" });

    const { createExam } = await import("@/lib/actions/exams");
    await createExam({
      customerId: "cust-1",
      examDate: "2026-02-24",
      examType: "FOLLOW_UP",
    });

    const callData = prisma.exam.create.mock.calls[0][0].data;
    expect(callData.paymentMethod).toBeNull();
  });
});

describe("getWeeklyExams", () => {
  it("queries exams within the week range", async () => {
    const prisma = await getPrisma();
    prisma.exam.findMany.mockResolvedValue([]);

    const { getWeeklyExams } = await import("@/lib/actions/exams");
    const result = await getWeeklyExams("2026-02-23");

    expect(prisma.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          examDate: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      })
    );
    expect(result.exams).toEqual([]);
    expect(result.totals.count).toBe(0);
  });

  it("computes totals correctly", async () => {
    const prisma = await getPrisma();
    prisma.exam.findMany.mockResolvedValue([
      {
        id: "e1",
        examDate: new Date("2026-02-24"),
        examType: "COMPREHENSIVE",
        doctorName: null,
        paymentMethod: "INSURANCE",
        amountBilled: 120,
        amountPaid: 100,
        ohipCovered: false,
        customer: { id: "c1", firstName: "Jane", lastName: "Doe" },
      },
      {
        id: "e2",
        examDate: new Date("2026-02-25"),
        examType: "FOLLOW_UP",
        doctorName: "Dr. X",
        paymentMethod: "CASH",
        amountBilled: 50,
        amountPaid: 50,
        ohipCovered: false,
        customer: { id: "c2", firstName: "Bob", lastName: "Smith" },
      },
    ]);

    const { getWeeklyExams } = await import("@/lib/actions/exams");
    const result = await getWeeklyExams("2026-02-23");

    expect(result.totals.count).toBe(2);
    expect(result.totals.totalBilled).toBe(170);
    expect(result.totals.totalPaid).toBe(150);
    expect(result.totals.byPaymentMethod.INSURANCE).toBe(1);
    expect(result.totals.byPaymentMethod.CASH).toBe(1);
  });
});
