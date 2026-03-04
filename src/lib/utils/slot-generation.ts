import { prisma } from "@/lib/prisma";

export type SlotInfo = {
  time: string; // ISO string
  available: boolean;
  providerId?: string;
  providerName?: string;
};

type GenerateSlotsOptions = {
  dateStr: string;
  serviceTypeId?: string;
  providerId?: string;
  includeBuffer?: boolean;
};

const MAX_BOOKING_DAYS = 90;

/**
 * Generate available time slots for a given date.
 * Uses provider availability, existing appointments, buffer times, and blocked times.
 */
export async function generateAvailableSlots(
  options: GenerateSlotsOptions
): Promise<SlotInfo[]> {
  const { dateStr, serviceTypeId, providerId, includeBuffer = true } = options;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return [];

  // Don't allow booking in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return [];

  // Don't allow booking more than 90 days out
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS);
  if (date > maxDate) return [];

  // Load service type config
  let duration = 30;
  let bufferAfter = 15;
  let requiresOD = false;

  if (serviceTypeId) {
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
      select: { duration: true, bufferAfter: true, requiresOD: true },
    });
    if (serviceType) {
      duration = serviceType.duration;
      bufferAfter = includeBuffer ? serviceType.bufferAfter : 0;
      requiresOD = serviceType.requiresOD;
    }
  }

  // Find eligible providers
  const providerWhere: Record<string, unknown> = { isActive: true };
  if (providerId) {
    providerWhere.id = providerId;
  } else if (requiresOD) {
    providerWhere.isOD = true;
  }

  const providers = await prisma.provider.findMany({
    where: providerWhere,
    include: {
      availability: {
        where: { dayOfWeek: date.getDay(), isActive: true },
      },
    },
  });

  if (providers.length === 0) return [];

  // Get day boundaries for queries
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Get existing appointments for this day
  const existing = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
    select: {
      scheduledAt: true,
      duration: true,
      bufferAfter: true,
      providerId: true,
    },
  });

  // Get blocked times for this day (provider-specific + clinic-wide)
  const providerIds = providers.map((p) => p.id);
  const blockedTimes = await prisma.blockedTime.findMany({
    where: {
      OR: [
        { providerId: { in: providerIds } },
        { providerId: null }, // clinic-wide blocks
      ],
      startAt: { lte: dayEnd },
      endAt: { gte: dayStart },
    },
    select: { startAt: true, endAt: true, providerId: true },
  });

  const now = new Date();
  const slots: SlotInfo[] = [];

  for (const provider of providers) {
    // Get availability for this day of week
    const avail = provider.availability[0];
    if (!avail) continue;

    // Parse start/end times
    const [startH, startM] = avail.startTime.split(":").map(Number);
    const [endH, endM] = avail.endTime.split(":").map(Number);

    const windowStart = new Date(date);
    windowStart.setHours(startH, startM, 0, 0);
    const windowEnd = new Date(date);
    windowEnd.setHours(endH, endM, 0, 0);

    const current = new Date(windowStart);

    while (current.getTime() + duration * 60 * 1000 <= windowEnd.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + duration * 60 * 1000);
      const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferAfter * 60 * 1000);

      // Skip past slots for today
      const isPast = slotStart < now;

      // Check conflicts with existing appointments for this provider
      const isBooked = existing.some((apt) => {
        // Only check conflicts for same provider or unassigned appointments
        if (apt.providerId && apt.providerId !== provider.id) return false;

        const aptStart = new Date(apt.scheduledAt);
        const aptEndWithBuffer = new Date(
          aptStart.getTime() + (apt.duration + (apt.bufferAfter || 0)) * 60 * 1000
        );

        // Check overlap: slot (with buffer) overlaps with appointment (with buffer)
        return slotStart < aptEndWithBuffer && slotEndWithBuffer > aptStart;
      });

      // Check blocked times
      const isBlocked = blockedTimes.some((bt) => {
        if (bt.providerId && bt.providerId !== provider.id) return false;
        const btStart = new Date(bt.startAt);
        const btEnd = new Date(bt.endAt);
        return slotStart < btEnd && slotEnd > btStart;
      });

      slots.push({
        time: slotStart.toISOString(),
        available: !isPast && !isBooked && !isBlocked,
        providerId: provider.id,
        providerName: provider.name,
      });

      // Advance by 30-min increments (standard slot grid)
      current.setMinutes(current.getMinutes() + 30);
    }
  }

  // Sort by time, then by provider
  slots.sort((a, b) => a.time.localeCompare(b.time));

  return slots;
}
