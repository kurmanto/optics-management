import { z } from "zod";

export const ExamSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  examDate: z.string().min(1, "Exam date is required"),
  examType: z.enum(["COMPREHENSIVE", "CONTACT_LENS", "FOLLOW_UP", "PEDIATRIC"]),
  doctorName: z.string().optional(),
  paymentMethod: z.enum([
    "CASH",
    "DEBIT",
    "CREDIT_VISA",
    "CREDIT_MASTERCARD",
    "CREDIT_AMEX",
    "CHEQUE",
    "E_TRANSFER",
    "INSURANCE",
    "OTHER",
  ]).optional(),
  billingCode: z.string().optional(),
  amountBilled: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
  ohipCovered: z.boolean().optional(),
  clinicalNotes: z.string().optional(),
});

export type ExamInput = z.infer<typeof ExamSchema>;
