import { z } from "zod";

export const PatientSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  gender: z.string().min(1, "Gender is required"),
  sameContactAsPrimary: z.boolean(),
  telephone: z.string(),
  address: z.string(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  medications: z.string(),
  allergies: z.string(),
  healthConditions: z.array(z.string()),
  familyEyeConditions: z.array(z.string()),
  screenHoursPerDay: z.string(),
  currentlyWearGlasses: z.array(z.string()),
  dilationPreference: z.string(),
  mainReasonForExam: z.string(),
  biggestVisionAnnoyance: z.string(),
  examConcerns: z.string(),
});

export const UnifiedIntakeSchema = z
  .object({
    visitType: z.enum(["COMPLETE_EYE_EXAM", "EYEWEAR_ONLY"], {
      error: "Visit type is required",
    }),
    newOrReturning: z.enum(["NEW", "RETURNING"]).optional().default("NEW"),
    whoIsThisFor: z.array(z.string()).min(1, "Please select who this visit is for"),
    patientCount: z.number().int().min(1).max(5),
    visionInsurance: z.string(),
    insuranceProviderName: z.string(),
    insurancePolicyNumber: z.string(),
    insuranceMemberId: z.string(),
    hearAboutUs: z.string().min(1, "Please tell us how you heard about us"),
    contactFullName: z.string().min(1, "Contact full name is required"),
    contactTelephone: z.string().min(10, "Contact phone must be at least 10 digits"),
    contactAddress: z.string().min(1, "Contact address is required"),
    contactCity: z.string().min(1, "Contact city is required"),
    contactEmail: z.string().email("Valid email is required"),
    patients: z.array(PatientSchema).min(1).max(5),
  })
  .superRefine((data, ctx) => {
    // Vision insurance is required when visitType is COMPLETE_EYE_EXAM
    if (data.visitType === "COMPLETE_EYE_EXAM" && !data.visionInsurance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vision insurance selection is required for eye exams",
        path: ["visionInsurance"],
      });
    }

    // Insurance provider is required when patient says they have insurance
    if (data.visionInsurance === "Yes, I have vision insurance" && !data.insuranceProviderName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Insurance provider name is required",
        path: ["insuranceProviderName"],
      });
    }

    // Validate patient count matches patients array
    if (data.patients.length !== data.patientCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Patient count does not match number of patient entries",
        path: ["patientCount"],
      });
    }

    // Eye-exam-specific fields required per patient
    if (data.visitType === "COMPLETE_EYE_EXAM") {
      data.patients.forEach((patient, i) => {
        if (!patient.dilationPreference) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Dilation preference is required for eye exams",
            path: ["patients", i, "dilationPreference"],
          });
        }
        if (!patient.mainReasonForExam) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Main reason for exam is required",
            path: ["patients", i, "mainReasonForExam"],
          });
        }
        if (!patient.biggestVisionAnnoyance) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Biggest vision annoyance is required",
            path: ["patients", i, "biggestVisionAnnoyance"],
          });
        }
      });
    }

    // Patient 2+ who don't use same contact must have their own telephone
    data.patients.forEach((patient, i) => {
      if (i > 0 && !patient.sameContactAsPrimary && !patient.telephone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone number is required when not using primary contact info",
          path: ["patients", i, "telephone"],
        });
      }
    });
  });

export type UnifiedIntakeData = z.infer<typeof UnifiedIntakeSchema>;
