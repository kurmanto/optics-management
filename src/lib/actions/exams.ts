"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { ExamSchema } from "@/lib/validations/exam";
import { ExamType } from "@prisma/client";

export type ExamFormState = {
  error?: string;
  success?: boolean;
};

export async function createExam(input: {
  customerId: string;
  examDate: string;
  examType: string;
  doctorName?: string;
  paymentMethod?: string;
  billingCode?: string;
  amountBilled?: number;
  amountPaid?: number;
  ohipCovered?: boolean;
  clinicalNotes?: string;
}): Promise<ExamFormState> {
  const session = await verifyRole("STAFF");

  const parsed = ExamSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const first = Object.values(errors).flat()[0];
    return { error: first || "Invalid data." };
  }

  const data = parsed.data;

  try {
    // Create exam — paymentMethod set via raw SQL because Vercel's cached
    // Prisma client may not recognize the field until next full rebuild
    const exam = await prisma.exam.create({
      data: {
        customerId: data.customerId,
        examDate: new Date(data.examDate),
        examType: data.examType as ExamType,
        doctorName: data.doctorName || null,
        billingCode: data.billingCode || null,
        amountBilled: data.amountBilled ?? null,
        amountPaid: data.amountPaid ?? null,
        ohipCovered: data.ohipCovered ?? false,
        clinicalNotes: data.clinicalNotes || null,
      },
    });

    if (data.paymentMethod) {
      await prisma.$executeRawUnsafe(
        `UPDATE exams SET payment_method = $1::"PaymentMethod" WHERE id = $2`,
        data.paymentMethod,
        exam.id,
      );
    }

    void logAudit({
      userId: session.id,
      action: "CREATE",
      model: "Exam",
      recordId: exam.id,
      changes: { customerId: data.customerId, examType: data.examType, paymentMethod: data.paymentMethod },
    });

    revalidatePath("/exams");
    revalidatePath(`/customers/${data.customerId}`);
    return { success: true };
  } catch (e) {
    console.error("createExam error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Failed to create exam: ${msg}` };
  }
}

export type WeeklyExamData = {
  exams: Array<{
    id: string;
    examDate: Date;
    examType: string;
    doctorName: string | null;
    paymentMethod: string | null;
    amountBilled: number | null;
    amountPaid: number | null;
    ohipCovered: boolean;
    customer: { id: string; firstName: string; lastName: string };
  }>;
  totals: {
    count: number;
    byPaymentMethod: Record<string, number>;
    totalBilled: number;
    totalPaid: number;
  };
};

export async function getWeeklyExams(weekStart: string): Promise<WeeklyExamData> {
  await verifySession();

  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  // Fetch exams with customer join — use raw SQL to ensure payment_method
  // is included even if the cached Prisma client doesn't know about it
  const exams = await prisma.$queryRawUnsafe<Array<{
    id: string;
    examDate: Date;
    examType: string;
    doctorName: string | null;
    payment_method: string | null;
    amountBilled: number | null;
    amountPaid: number | null;
    ohipCovered: boolean;
    customerId: string;
    firstName: string;
    lastName: string;
  }>>(
    `SELECT e.id, e."examDate", e."examType"::text, e."doctorName",
            e.payment_method::text, e."amountBilled", e."amountPaid", e."ohipCovered",
            e."customerId", c."firstName", c."lastName"
     FROM exams e
     JOIN customers c ON c.id = e."customerId"
     WHERE e."examDate" >= $1 AND e."examDate" < $2
     ORDER BY e."examDate" ASC`,
    start,
    end,
  );

  const byPaymentMethod: Record<string, number> = {};
  let totalBilled = 0;
  let totalPaid = 0;

  for (const exam of exams) {
    const method = exam.payment_method || "UNSPECIFIED";
    byPaymentMethod[method] = (byPaymentMethod[method] || 0) + 1;
    totalBilled += exam.amountBilled ?? 0;
    totalPaid += exam.amountPaid ?? 0;
  }

  return {
    exams: exams.map((e) => ({
      id: e.id,
      examDate: e.examDate,
      examType: e.examType,
      doctorName: e.doctorName,
      paymentMethod: e.payment_method,
      amountBilled: e.amountBilled,
      amountPaid: e.amountPaid,
      ohipCovered: e.ohipCovered,
      customer: { id: e.customerId, firstName: e.firstName, lastName: e.lastName },
    })),
    totals: {
      count: exams.length,
      byPaymentMethod,
      totalBilled,
      totalPaid,
    },
  };
}
