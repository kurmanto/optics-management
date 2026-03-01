"use server";

import { prisma } from "@/lib/prisma";
import { verifyClientSession } from "@/lib/client-dal";
import { logAudit } from "@/lib/audit";
import { BookAppointmentSchema } from "@/lib/validations/client-portal";
import { AppointmentType } from "@prisma/client";
import { checkAndUnlockCards } from "@/lib/unlock-triggers";

// Business hours: 9 AM - 6 PM, 30-minute slots
const OPENING_HOUR = 9;
const CLOSING_HOUR = 18;
const SLOT_DURATION_MINUTES = 30;

export async function getAvailableSlots(dateStr: string, type: string) {
  const session = await verifyClientSession();

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return [];

  // Don't allow booking in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return [];

  // Don't allow booking more than 90 days out
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  if (date > maxDate) return [];

  // Get day's start and end
  const dayStart = new Date(date);
  dayStart.setHours(OPENING_HOUR, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(CLOSING_HOUR, 0, 0, 0);

  // Get existing appointments for this day
  const existing = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
    select: { scheduledAt: true, duration: true },
  });

  // Generate all possible slots
  const slots: { time: string; available: boolean }[] = [];
  const current = new Date(dayStart);

  while (current < dayEnd) {
    const slotTime = current.toISOString();
    const slotEnd = new Date(current.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

    // Check if this slot conflicts with any existing appointment
    const isBooked = existing.some((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60 * 1000);
      return current < aptEnd && slotEnd > aptStart;
    });

    // Don't show past slots for today
    const isPast = current < new Date();

    slots.push({ time: slotTime, available: !isBooked && !isPast });

    current.setMinutes(current.getMinutes() + SLOT_DURATION_MINUTES);
  }

  // Also filter: we suppress the session check result but use it for scoping
  void session;

  return slots;
}

export async function bookAppointment(
  _prevState: { error?: string; success?: boolean; appointmentId?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean; appointmentId?: string }> {
  const session = await verifyClientSession();

  const raw = {
    customerId: formData.get("customerId") as string,
    type: formData.get("type") as string,
    scheduledAt: formData.get("scheduledAt") as string,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = BookAppointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify customer belongs to family
  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data.customerId },
    select: { id: true, familyId: true },
  });

  if (!customer || customer.familyId !== session.familyId) {
    return { error: "Invalid family member selected." };
  }

  // Verify slot is still available
  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
    return { error: "Invalid or past date selected." };
  }

  const slotEnd = new Date(scheduledAt.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
  const conflict = await prisma.appointment.findFirst({
    where: {
      scheduledAt: { gte: scheduledAt, lt: slotEnd },
      status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
  });

  if (conflict) {
    return { error: "This time slot is no longer available. Please choose another." };
  }

  const appointment = await prisma.appointment.create({
    data: {
      customerId: parsed.data.customerId,
      type: parsed.data.type as AppointmentType,
      scheduledAt,
      duration: SLOT_DURATION_MINUTES,
      notes: parsed.data.notes,
    },
  });

  void logAudit({
    action: "CLIENT_BOOKING",
    model: "Appointment",
    recordId: appointment.id,
    changes: {
      customerId: parsed.data.customerId,
      type: parsed.data.type,
      bookedVia: "client_portal",
    },
  });

  void checkAndUnlockCards(session.familyId);

  return { success: true, appointmentId: appointment.id };
}

export async function cancelAppointment(appointmentId: string): Promise<{ error?: string }> {
  const session = await verifyClientSession();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: { select: { familyId: true } } },
  });

  if (!appointment || appointment.customer.familyId !== session.familyId) {
    return { error: "Appointment not found." };
  }

  if (!["SCHEDULED", "CONFIRMED"].includes(appointment.status)) {
    return { error: "This appointment cannot be cancelled." };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
  });

  void logAudit({
    action: "STATUS_CHANGE",
    model: "Appointment",
    recordId: appointmentId,
    changes: { from: appointment.status, to: "CANCELLED", cancelledVia: "client_portal" },
  });

  return {};
}
