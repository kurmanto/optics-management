import { z } from "zod";

export const CustomerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  familyId: z.string().optional().or(z.literal("")),
  smsOptIn: z.boolean().default(true),
  emailOptIn: z.boolean().default(true),
  hearAboutUs: z
    .enum(["GOOGLE", "INSTAGRAM", "WALK_BY", "REFERRAL", "RETURNING", "DOCTOR_REFERRAL", "OTHER"])
    .optional()
    .or(z.literal("")),
  referredByName: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof CustomerSchema>;

export const MedicalHistorySchema = z.object({
  eyeConditions: z.array(z.string()).default([]),
  systemicConditions: z.array(z.string()).default([]),
  medications: z.string().optional().or(z.literal("")),
  allergies: z.string().optional().or(z.literal("")),
  familyGlaucoma: z.boolean().default(false),
  familyAmd: z.boolean().default(false),
  familyHighMyopia: z.boolean().default(false),
  familyColorblind: z.boolean().default(false),
  hadLasik: z.boolean().default(false),
  wearsContacts: z.boolean().default(false),
  contactType: z.string().optional().or(z.literal("")),
  primaryUse: z.string().optional().or(z.literal("")),
  screenTimeDaily: z.number().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
});

export type MedicalHistoryFormValues = z.infer<typeof MedicalHistorySchema>;

export const StoreCreditSchema = z.object({
  type: z.enum(["REFERRAL", "INSURANCE", "PROMOTION", "REFUND"]),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
});

export type StoreCreditFormValues = z.infer<typeof StoreCreditSchema>;
