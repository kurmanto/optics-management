import { z } from "zod";

export const InsurancePolicySchema = z.object({
  providerName: z.string().min(1, "Provider name is required"),
  policyNumber: z.string().optional(),
  groupNumber: z.string().optional(),
  memberId: z.string().optional(),
  coverageType: z.enum(["VISION", "OHIP", "EXTENDED_HEALTH", "COMBINED"]),
  contractNumber: z.string().optional(),
  estimatedCoverage: z.coerce.number().min(0).optional(),
  maxFrames: z.coerce.number().min(0).optional(),
  maxLenses: z.coerce.number().min(0).optional(),
  maxContacts: z.coerce.number().min(0).optional(),
  maxExam: z.coerce.number().min(0).optional(),
  lastClaimDate: z.string().optional(),
  eligibilityIntervalMonths: z.coerce.number().int().min(1).default(24),
  notes: z.string().optional(),
});

export type InsurancePolicyInput = z.infer<typeof InsurancePolicySchema>;
