import { z } from "zod";

export const QuizAnswersSchema = z.object({
  primaryUse: z.enum(["ALL_DAY", "WORK_SCREENS", "DRIVING", "READING", "SPORTS"]),
  wearTime: z.enum(["HEAVY", "MODERATE", "LIGHT"]),
  frustration: z.enum(["NEVER_RIGHT", "HEADACHES", "BLURRY_EDGES", "HEAVY_THICK", "NO_ISSUES"]),
  currentGlasses: z.enum(["YES_PROGRESSIVE", "YES_SINGLE", "NO_GLASSES"]),
  sunglasses: z.enum(["YES_PRESCRIPTION", "YES_CLIP", "NOT_NOW"]),
  hasBenefits: z.enum(["YES", "NOT_SURE", "NO"]),
});

export const LensQuizSubmissionSchema = z.object({
  answers: QuizAnswersSchema,
  firstName: z.string().min(1, "First name is required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  preferredTimeframe: z.string().optional().or(z.literal("")),
  utmSource: z.string().optional().or(z.literal("")),
  utmMedium: z.string().optional().or(z.literal("")),
  utmCampaign: z.string().optional().or(z.literal("")),
}).refine(
  (data) => (data.phone && data.phone.length >= 10) || (data.email && data.email.includes("@")),
  { message: "Please provide a valid phone number or email address" }
);

export type LensQuizSubmissionInput = z.infer<typeof LensQuizSubmissionSchema>;

export const LensMatchBookingSchema = z.object({
  quoteId: z.string().min(1, "Quote ID is required"),
  customerId: z.string().min(1, "Please select a family member"),
  type: z.enum(["CONSULTATION", "EYE_EXAM"]),
  scheduledAt: z.string().min(1, "Please select a date and time"),
});

export const LensMatchCallbackSchema = z.object({
  quoteId: z.string().min(1, "Quote ID is required"),
  requestedType: z.enum(["CONSULTATION", "EYE_EXAM"]),
});
