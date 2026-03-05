import { AppointmentType } from "@prisma/client";

/**
 * Maps ServiceType slugs to legacy AppointmentType enum values.
 * Used when creating appointments from the new ServiceType system
 * to populate the legacy `type` field for backwards compatibility.
 */
const SLUG_TO_TYPE: Record<string, AppointmentType> = {
  "eye-exam": AppointmentType.EYE_EXAM,
  "contact-lens-fitting": AppointmentType.CONTACT_LENS_FITTING,
  "follow-up": AppointmentType.FOLLOW_UP,
  "glasses-pickup": AppointmentType.GLASSES_PICKUP,
  "adjustment": AppointmentType.ADJUSTMENT,
  "styling": AppointmentType.STYLING,
  "consultation": AppointmentType.CONSULTATION,
};

export function slugToAppointmentType(slug: string): AppointmentType {
  return SLUG_TO_TYPE[slug] ?? AppointmentType.CONSULTATION;
}
