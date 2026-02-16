import { z } from "zod";

export const NewPatientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactPhone: z.string().optional().or(z.literal("")),
  healthCardNumber: z.string().optional().or(z.literal("")),
  referralSource: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const HipaaConsentFormSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  smsOptIn: z.boolean().default(false),
  emailOptIn: z.boolean().default(false),
  shareWithInsurance: z.boolean().default(false),
  acknowledgedPrivacyPolicy: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge the privacy policy",
  }),
  signatureText: z.string().min(1, "Signature is required"),
});

export const FrameRepairWaiverSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  frameDescription: z.string().min(1, "Frame description is required"),
  repairDescription: z.string().min(1, "Repair description is required"),
  acknowledgedRisk: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge the risk",
  }),
  signatureText: z.string().min(1, "Signature is required"),
});

export const InsuranceVerificationSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  insuranceProviderName: z.string().min(1, "Insurance provider is required"),
  policyNumber: z.string().optional().or(z.literal("")),
  groupNumber: z.string().optional().or(z.literal("")),
  memberId: z.string().optional().or(z.literal("")),
  policyHolderName: z.string().optional().or(z.literal("")),
  policyHolderDob: z.string().optional().or(z.literal("")),
  relationshipToHolder: z
    .enum(["SELF", "SPOUSE", "DEPENDENT", "OTHER"])
    .optional()
    .or(z.literal("")),
  coverageType: z
    .enum(["VISION", "OHIP", "EXTENDED_HEALTH", "COMBINED"])
    .optional()
    .or(z.literal("")),
  renewalMonth: z.string().optional().or(z.literal("")),
  renewalYear: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const CreateFormSubmissionSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type NewPatientFormData = z.infer<typeof NewPatientFormSchema>;
export type HipaaConsentFormData = z.infer<typeof HipaaConsentFormSchema>;
export type FrameRepairWaiverData = z.infer<typeof FrameRepairWaiverSchema>;
export type InsuranceVerificationData = z.infer<typeof InsuranceVerificationSchema>;
