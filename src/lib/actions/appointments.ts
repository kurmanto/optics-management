"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { AppointmentSchema } from "@/lib/validations/appointment";
import { AppointmentType, AppointmentStatus } from "@prisma/client";

export async function createAppointment(
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  await verifySession();

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

    revalidatePath(`/customers/${data.customerId}`);
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

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<{ success: true } | { error: string }> {
  await verifySession();

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

    revalidatePath(`/customers/${appt.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update appointment" };
  }
}

export async function cancelAppointment(
  id: string
): Promise<{ success: true } | { error: string }> {
  return updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
}
