"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { ExamSchema } from "@/lib/validations/exam";
import { ExamType, PaymentMethod } from "@prisma/client";

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
    const exam = await prisma.exam.create({
      data: {
        customerId: data.customerId,
        examDate: new Date(data.examDate),
        examType: data.examType as ExamType,
        doctorName: data.doctorName || null,
        paymentMethod: (data.paymentMethod as PaymentMethod) || null,
        billingCode: data.billingCode || null,
        amountBilled: data.amountBilled ?? null,
        amountPaid: data.amountPaid ?? null,
        ohipCovered: data.ohipCovered ?? false,
        clinicalNotes: data.clinicalNotes || null,
      },
    });

    void logAudit({
      userId: session.id,
      action: "CREATE",
      model: "Exam",
      recordId: exam.id,
      changes: { customerId: data.customerId, examType: data.examType },
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

  const exams = await prisma.exam.findMany({
    where: {
      examDate: { gte: start, lt: end },
    },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { examDate: "asc" },
  });

  const byPaymentMethod: Record<string, number> = {};
  let totalBilled = 0;
  let totalPaid = 0;

  for (const exam of exams) {
    const method = exam.paymentMethod || "UNSPECIFIED";
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
      paymentMethod: e.paymentMethod,
      amountBilled: e.amountBilled,
      amountPaid: e.amountPaid,
      ohipCovered: e.ohipCovered,
      customer: e.customer,
    })),
    totals: {
      count: exams.length,
      byPaymentMethod,
      totalBilled,
      totalPaid,
    },
  };
}
