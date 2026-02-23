"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { AppointmentSchema, RescheduleSchema } from "@/lib/validations/appointment";
import { AppointmentType, AppointmentStatus } from "@prisma/client";
import type { CalendarAppointment } from "@/lib/types/appointment";

export async function createAppointment(
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  const session = await verifyRole("STAFF");

  const parsed = AppointmentSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  try {
    const appt = await prisma.appointment.create({
      data: {
        customerId: data.customerId,
        type: data.type as AppointmentType,
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration,
        notes: data.notes || null,
        status: AppointmentStatus.SCHEDULED,
      },
    });

    void logAudit({ userId: session.id, action: "CREATE", model: "Appointment", recordId: appt.id });
    revalidatePath(`/customers/${data.customerId}`);
    revalidatePath("/appointments");
    return { id: appt.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create appointment" };
  }
}

export async function getUpcomingAppointments(customerId: string) {
  await verifySession();

  return prisma.appointment.findMany({
    where: {
      customerId,
      scheduledAt: { gte: new Date() },
      status: { not: AppointmentStatus.CANCELLED },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function getAppointmentsForRange(
  startDate: Date,
  endDate: Date
): Promise<CalendarAppointment[]> {
  await verifySession();

  const appts = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: startDate, lt: endDate },
    },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return appts.map((a) => ({
    id: a.id,
    type: a.type,
    status: a.status,
    scheduledAt: a.scheduledAt.toISOString(),
    duration: a.duration,
    notes: a.notes,
    customerId: a.customerId,
    customerName: `${a.customer.firstName} ${a.customer.lastName}`,
    customerPhone: a.customer.phone,
  }));
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("STAFF");

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: { customerId: true },
    });
    if (!appt) return { error: "Appointment not found" };

    await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    void logAudit({ userId: session.id, action: "STATUS_CHANGE", model: "Appointment", recordId: id, changes: { after: { status } } });
    revalidatePath(`/customers/${appt.customerId}`);
    revalidatePath("/appointments");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update appointment" };
  }
}

export async function rescheduleAppointment(
  rawData: unknown
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("STAFF");

  const parsed = RescheduleSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { id, scheduledAt } = parsed.data;

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: { customerId: true },
    });
    if (!appt) return { error: "Appointment not found" };

    await prisma.appointment.update({
      where: { id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: AppointmentStatus.SCHEDULED,
      },
    });

    void logAudit({ userId: session.id, action: "UPDATE", model: "Appointment", recordId: id, changes: { after: { scheduledAt } } });
    revalidatePath(`/customers/${appt.customerId}`);
    revalidatePath("/appointments");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to reschedule appointment" };
  }
}

export async function cancelAppointment(
  id: string
): Promise<{ success: true } | { error: string }> {
  return updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
}
