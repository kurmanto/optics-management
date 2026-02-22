import { z } from "zod";

export const AppointmentSchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(["EYE_EXAM", "CONTACT_LENS_FITTING", "FOLLOW_UP", "GLASSES_PICKUP", "ADJUSTMENT", "STYLING"]),
  scheduledAt: z.string().min(1, "Date and time are required"),
  duration: z.coerce.number().int().min(5).default(30),
  notes: z.string().optional(),
});

export type AppointmentInput = z.infer<typeof AppointmentSchema>;

export const RescheduleSchema = z.object({
  id: z.string().min(1, "Appointment ID is required"),
  scheduledAt: z.string().min(1, "Date and time are required"),
});

export type RescheduleInput = z.infer<typeof RescheduleSchema>;
