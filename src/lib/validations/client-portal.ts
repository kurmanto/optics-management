import { z } from "zod";

export const MagicLinkRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const ClientLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const SetClientPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const CreateClientAccountSchema = z.object({
  familyId: z.string().min(1, "Family is required"),
  primaryCustomerId: z.string().min(1, "Primary customer is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
});

export const CreateUnlockCardSchema = z.object({
  familyId: z.string().min(1),
  customerId: z.string().optional(),
  type: z.string().min(1, "Card type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["LOCKED", "UNLOCKED", "CLAIMED", "EXPIRED"]).default("LOCKED"),
  value: z.coerce.number().optional(),
  valueType: z.string().optional(),
  progressGoal: z.coerce.number().optional(),
  triggerRule: z
    .object({
      type: z.enum(["STYLE_QUIZ_COMPLETED", "REFERRAL_COUNT", "ORDER_COUNT", "APPOINTMENT_BOOKED"]),
      threshold: z.number().int().positive().optional(),
    })
    .optional(),
});

export const StyleQuizSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  choices: z.object({
    shape: z.enum(["ROUND", "ANGULAR"]),
    size: z.enum(["OVERSIZED", "COMPACT"]),
    material: z.enum(["ACETATE", "METAL"]),
    style: z.enum(["BOLD", "MINIMAL"]),
    color: z.enum(["WARM", "COOL"]),
    vibe: z.enum(["CLASSIC", "TRENDY"]),
  }),
});

export const BookAppointmentSchema = z.object({
  customerId: z.string().min(1, "Please select a family member"),
  type: z.enum(["EYE_EXAM", "CONTACT_LENS_FITTING", "FOLLOW_UP", "GLASSES_PICKUP", "ADJUSTMENT", "STYLING"]),
  scheduledAt: z.string().min(1, "Please select a date and time"),
  notes: z.string().optional(),
});
