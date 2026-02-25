import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>> & {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };
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
          amountBilled: 100,
          amountPaid: 80,
          ohipCovered: true,
        }),
      })
    );
    // paymentMethod set via raw SQL after create
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE exams SET payment_method"),
      "INSURANCE",
      "exam-1",
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

  it("does not set paymentMethod when not provided", async () => {
    const prisma = await getPrisma();
    prisma.exam.create.mockResolvedValue({ id: "exam-2" });

    const { createExam } = await import("@/lib/actions/exams");
    await createExam({
      customerId: "cust-1",
      examDate: "2026-02-24",
      examType: "FOLLOW_UP",
    });

    // paymentMethod not in create call, and no raw SQL update
    const callData = prisma.exam.create.mock.calls[0][0].data;
    expect(callData.paymentMethod).toBeUndefined();
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});

describe("getWeeklyExams", () => {
  it("queries exams within the week range", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([]);

    const { getWeeklyExams } = await import("@/lib/actions/exams");
    const result = await getWeeklyExams("2026-02-23");

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("FROM exams"),
      expect.any(Date),
      expect.any(Date),
    );
    expect(result.exams).toEqual([]);
    expect(result.totals.count).toBe(0);
  });

  it("computes totals correctly", async () => {
    const prisma = await getPrisma();
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: "e1",
        examDate: new Date("2026-02-24"),
        examType: "COMPREHENSIVE",
        doctorName: null,
        payment_method: "INSURANCE",
        amountBilled: 120,
        amountPaid: 100,
        ohipCovered: false,
        customerId: "c1",
        firstName: "Jane",
        lastName: "Doe",
      },
      {
        id: "e2",
        examDate: new Date("2026-02-25"),
        examType: "FOLLOW_UP",
        doctorName: "Dr. X",
        payment_method: "CASH",
        amountBilled: 50,
        amountPaid: 50,
        ohipCovered: false,
        customerId: "c2",
        firstName: "Bob",
        lastName: "Smith",
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
