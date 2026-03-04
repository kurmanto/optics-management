"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import {
  CreateServiceTypeSchema,
  UpdateServiceTypeSchema,
  CreateProviderSchema,
  UpdateProviderSchema,
  SetAvailabilitySchema,
  CreateBlockedTimeSchema,
  UpdateAppointmentSettingsSchema,
} from "@/lib/validations/appointment-settings";

const SETTINGS_PATH = "/appointments/settings";

// ─── Service Types ───────────────────────────────────────────────────────────

export async function getServiceTypes() {
  await verifyRole("STAFF");
  return prisma.serviceType.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createServiceType(
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  const session = await verifyRole("ADMIN");

  const parsed = CreateServiceTypeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  try {
    const existing = await prisma.serviceType.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) return { error: "A service type with this slug already exists" };

    const st = await prisma.serviceType.create({ data: parsed.data });
    void logAudit({ userId: session.id, action: "CREATE", model: "ServiceType", recordId: st.id });
    revalidatePath(SETTINGS_PATH);
    return { id: st.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create service type" };
  }
}

export async function updateServiceType(
  rawData: unknown
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  const parsed = UpdateServiceTypeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { id, ...data } = parsed.data;

  try {
    await prisma.serviceType.update({ where: { id }, data });
    void logAudit({ userId: session.id, action: "UPDATE", model: "ServiceType", recordId: id });
    revalidatePath(SETTINGS_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update service type" };
  }
}

export async function toggleServiceType(
  id: string,
  isActive: boolean
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  try {
    await prisma.serviceType.update({ where: { id }, data: { isActive } });
    void logAudit({
      userId: session.id,
      action: "STATUS_CHANGE",
      model: "ServiceType",
      recordId: id,
      changes: { after: { isActive } },
    });
    revalidatePath(SETTINGS_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to toggle service type" };
  }
}

// ─── Providers ───────────────────────────────────────────────────────────────

export async function getProviders() {
  await verifyRole("STAFF");
  return prisma.provider.findMany({
    orderBy: { name: "asc" },
    include: { availability: { orderBy: { dayOfWeek: "asc" } } },
  });
}

export async function createProvider(
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  const session = await verifyRole("ADMIN");

  const parsed = CreateProviderSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  try {
    const provider = await prisma.provider.create({ data: parsed.data });
    void logAudit({ userId: session.id, action: "CREATE", model: "Provider", recordId: provider.id });
    revalidatePath(SETTINGS_PATH);
    return { id: provider.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create provider" };
  }
}

export async function updateProvider(
  rawData: unknown
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  const parsed = UpdateProviderSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { id, ...data } = parsed.data;

  try {
    await prisma.provider.update({ where: { id }, data });
    void logAudit({ userId: session.id, action: "UPDATE", model: "Provider", recordId: id });
    revalidatePath(SETTINGS_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update provider" };
  }
}

export async function toggleProvider(
  id: string,
  isActive: boolean
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  try {
    await prisma.provider.update({ where: { id }, data: { isActive } });
    void logAudit({
      userId: session.id,
      action: "STATUS_CHANGE",
      model: "Provider",
      recordId: id,
      changes: { after: { isActive } },
    });
    revalidatePath(SETTINGS_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to toggle provider" };
  }
}

// ─── Provider Availability ───────────────────────────────────────────────────

export async function setProviderAvailability(
  rawData: unknown
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  const parsed = SetAvailabilitySchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { providerId, dayOfWeek, startTime, endTime, isActive } = parsed.data;

  // Validate startTime < endTime
  if (startTime >= endTime) {
    return { error: "Start time must be before end time" };
  }

  try {
    await prisma.providerAvailability.upsert({
      where: {
        providerId_dayOfWeek: { providerId, dayOfWeek },
      },
      create: { providerId, dayOfWeek, startTime, endTime, isActive },
      update: { startTime, endTime, isActive },
    });

    void logAudit({
      userId: session.id,
      action: "UPDATE",
      model: "ProviderAvailability",
      recordId: providerId,
      changes: { after: { dayOfWeek, startTime, endTime, isActive } },
    });
    revalidatePath(SETTINGS_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to set availability" };
  }
}

export async function removeProviderAvailability(
  providerId: string,
  dayOfWeek: number
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  try {
    await prisma.providerAvailability.delete({
      where: {
        providerId_dayOfWeek: { providerId, dayOfWeek },
      },
    });

    void logAudit({
      userId: session.id,
      action: "DELETE",
      model: "ProviderAvailability",
      recordId: providerId,
      changes: { after: { dayOfWeek } },
    });
    revalidatePath(SETTINGS_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to remove availability" };
  }
}

// ─── Blocked Time ────────────────────────────────────────────────────────────

export async function getBlockedTimes() {
  await verifyRole("STAFF");
  return prisma.blockedTime.findMany({
    orderBy: { startAt: "desc" },
    include: { provider: { select: { id: true, name: true } } },
  });
}

export async function createBlockedTime(
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  const session = await verifyRole("ADMIN");

  const parsed = CreateBlockedTimeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(parsed.data.endAt);

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return { error: "Invalid date/time" };
  }
  if (startAt >= endAt) {
    return { error: "Start must be before end" };
  }

  try {
    const bt = await prisma.blockedTime.create({
      data: {
        providerId: parsed.data.providerId || null,
        startAt,
        endAt,
        reason: parsed.data.reason || null,
        isRecurring: parsed.data.isRecurring,
      },
    });

    void logAudit({ userId: session.id, action: "CREATE", model: "BlockedTime", recordId: bt.id });
    revalidatePath(SETTINGS_PATH);
    return { id: bt.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create blocked time" };
  }
}

export async function deleteBlockedTime(
  id: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  try {
    await prisma.blockedTime.delete({ where: { id } });
    void logAudit({ userId: session.id, action: "DELETE", model: "BlockedTime", recordId: id });
    revalidatePath(SETTINGS_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to delete blocked time" };
  }
}

// ─── Appointment Settings (singleton) ────────────────────────────────────────

export async function getAppointmentSettings() {
  await verifyRole("STAFF");

  let settings = await prisma.appointmentSettings.findFirst();
  if (!settings) {
    settings = await prisma.appointmentSettings.create({
      data: { minCancelHours: 24 },
    });
  }
  return settings;
}

export async function updateAppointmentSettings(
  rawData: unknown
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  const parsed = UpdateAppointmentSettingsSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  try {
    let settings = await prisma.appointmentSettings.findFirst();
    if (!settings) {
      settings = await prisma.appointmentSettings.create({
        data: { minCancelHours: parsed.data.minCancelHours },
      });
    } else {
      await prisma.appointmentSettings.update({
        where: { id: settings.id },
        data: { minCancelHours: parsed.data.minCancelHours },
      });
    }

    void logAudit({
      userId: session.id,
      action: "UPDATE",
      model: "AppointmentSettings",
      recordId: settings.id,
      changes: { after: parsed.data },
    });
    revalidatePath(SETTINGS_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update settings" };
  }
}
