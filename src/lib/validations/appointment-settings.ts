import { z } from "zod";

// ─── ServiceType ─────────────────────────────────────────────────────────────

export const CreateServiceTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500).optional(),
  duration: z.coerce.number().int().min(5, "Minimum 5 minutes").max(240),
  bufferAfter: z.coerce.number().int().min(0).max(60).default(15),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color")
    .default("#3B82F6"),
  bgColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color")
    .default("#EFF6FF"),
  requiresOD: z.coerce.boolean().default(false),
  isPublicBookable: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type CreateServiceTypeInput = z.infer<typeof CreateServiceTypeSchema>;

export const UpdateServiceTypeSchema = CreateServiceTypeSchema.partial().extend({
  id: z.string().min(1),
});

export type UpdateServiceTypeInput = z.infer<typeof UpdateServiceTypeSchema>;

// ─── Provider ────────────────────────────────────────────────────────────────

export const CreateProviderSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  title: z.string().min(1).max(50).default("Optician"),
  isOD: z.coerce.boolean().default(false),
  userId: z.string().optional(),
});

export type CreateProviderInput = z.infer<typeof CreateProviderSchema>;

export const UpdateProviderSchema = CreateProviderSchema.partial().extend({
  id: z.string().min(1),
});

export type UpdateProviderInput = z.infer<typeof UpdateProviderSchema>;

// ─── ProviderAvailability ────────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const SetAvailabilitySchema = z.object({
  providerId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, "Must be HH:mm format"),
  endTime: z.string().regex(timeRegex, "Must be HH:mm format"),
  isActive: z.coerce.boolean().default(true),
});

export type SetAvailabilityInput = z.infer<typeof SetAvailabilitySchema>;

// ─── BlockedTime ─────────────────────────────────────────────────────────────

export const CreateBlockedTimeSchema = z.object({
  providerId: z.string().optional(), // null = clinic-wide
  startAt: z.string().min(1, "Start date/time is required"),
  endAt: z.string().min(1, "End date/time is required"),
  reason: z.string().max(200).optional(),
  isRecurring: z.coerce.boolean().default(false),
});

export type CreateBlockedTimeInput = z.infer<typeof CreateBlockedTimeSchema>;

// ─── AppointmentSettings ─────────────────────────────────────────────────────

export const UpdateAppointmentSettingsSchema = z.object({
  minCancelHours: z.coerce.number().int().min(0).max(168),
});

export type UpdateAppointmentSettingsInput = z.infer<typeof UpdateAppointmentSettingsSchema>;
