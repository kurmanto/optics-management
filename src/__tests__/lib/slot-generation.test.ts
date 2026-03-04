import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import type { PrismaMock } from "../mocks/prisma";

const db = prisma as unknown as PrismaMock;

/** Produce a local YYYY-MM-DD string that won't shift across timezones */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Create a Date at a specific hour on the same local day the slot generator will parse */
function dateAtHour(dateStr: string, hour: number, minute = 0): Date {
  const d = new Date(dateStr);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe("generateAvailableSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importModule() {
    const mod = await import("@/lib/utils/slot-generation");
    return mod.generateAvailableSlots;
  }

  it("returns empty array for invalid date", async () => {
    const generateAvailableSlots = await importModule();
    const result = await generateAvailableSlots({ dateStr: "invalid" });
    expect(result).toEqual([]);
  });

  it("returns empty array for past date", async () => {
    const generateAvailableSlots = await importModule();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const result = await generateAvailableSlots({
      dateStr: localDateStr(pastDate),
    });
    expect(result).toEqual([]);
  });

  it("returns empty array for date beyond 90 days", async () => {
    const generateAvailableSlots = await importModule();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 100);
    const result = await generateAvailableSlots({
      dateStr: localDateStr(futureDate),
    });
    expect(result).toEqual([]);
  });

  it("returns empty array when no providers exist", async () => {
    const generateAvailableSlots = await importModule();

    db.serviceType.findUnique.mockResolvedValue({
      duration: 30,
      bufferAfter: 15,
      requiresOD: false,
    });
    db.provider.findMany.mockResolvedValue([]);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const result = await generateAvailableSlots({
      dateStr: localDateStr(futureDate),
      serviceTypeId: "st_eye_exam",
    });

    expect(result).toEqual([]);
  });

  it("generates slots within provider availability window", async () => {
    const generateAvailableSlots = await importModule();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = localDateStr(futureDate);
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getDay();

    db.serviceType.findUnique.mockResolvedValue({
      duration: 30,
      bufferAfter: 0,
      requiresOD: false,
    });
    db.provider.findMany.mockResolvedValue([
      {
        id: "prov-1",
        name: "Dr. Test",
        isOD: true,
        isActive: true,
        availability: [
          {
            id: "avail-1",
            providerId: "prov-1",
            dayOfWeek,
            startTime: "09:00",
            endTime: "12:00",
            isActive: true,
          },
        ],
      },
    ]);
    db.appointment.findMany.mockResolvedValue([]);
    db.blockedTime.findMany.mockResolvedValue([]);

    const result = await generateAvailableSlots({
      dateStr,
      serviceTypeId: "st_eye_exam",
      includeBuffer: false,
    });

    // 9:00-12:00 with 30-min slots = 6 slots (9:00, 9:30, 10:00, 10:30, 11:00, 11:30)
    expect(result).toHaveLength(6);
    expect(result.every((s) => s.available)).toBe(true);
    expect(result[0].providerId).toBe("prov-1");
    expect(result[0].providerName).toBe("Dr. Test");
  });

  it("marks conflicting slots as unavailable", async () => {
    const generateAvailableSlots = await importModule();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = localDateStr(futureDate);
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getDay();
    const apptTime = dateAtHour(dateStr, 10);

    db.serviceType.findUnique.mockResolvedValue({
      duration: 30,
      bufferAfter: 0,
      requiresOD: false,
    });
    db.provider.findMany.mockResolvedValue([
      {
        id: "prov-1",
        name: "Dr. Test",
        isOD: true,
        isActive: true,
        availability: [
          { id: "a1", providerId: "prov-1", dayOfWeek, startTime: "09:00", endTime: "12:00", isActive: true },
        ],
      },
    ]);
    db.appointment.findMany.mockResolvedValue([
      { scheduledAt: apptTime, duration: 30, bufferAfter: 0, providerId: "prov-1" },
    ]);
    db.blockedTime.findMany.mockResolvedValue([]);

    const result = await generateAvailableSlots({
      dateStr,
      serviceTypeId: "st_eye_exam",
      includeBuffer: false,
    });

    // The 10:00 slot should be unavailable
    const slot10 = result.find((s) => new Date(s.time).getHours() === 10 && new Date(s.time).getMinutes() === 0);
    expect(slot10?.available).toBe(false);
  });

  it("respects buffer time after appointments", async () => {
    const generateAvailableSlots = await importModule();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = localDateStr(futureDate);
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getDay();
    const apptTime = dateAtHour(dateStr, 10);

    db.serviceType.findUnique.mockResolvedValue({
      duration: 30,
      bufferAfter: 15,
      requiresOD: false,
    });
    db.provider.findMany.mockResolvedValue([
      {
        id: "prov-1",
        name: "Dr. Test",
        isOD: true,
        isActive: true,
        availability: [
          { id: "a1", providerId: "prov-1", dayOfWeek, startTime: "09:00", endTime: "12:00", isActive: true },
        ],
      },
    ]);
    db.appointment.findMany.mockResolvedValue([
      { scheduledAt: apptTime, duration: 30, bufferAfter: 15, providerId: "prov-1" },
    ]);
    db.blockedTime.findMany.mockResolvedValue([]);

    const result = await generateAvailableSlots({
      dateStr,
      serviceTypeId: "st_eye_exam",
    });

    // 10:00 slot booked with 15 min buffer → 10:00 and 10:30 should be unavailable
    const slot10 = result.find((s) => new Date(s.time).getHours() === 10 && new Date(s.time).getMinutes() === 0);
    const slot1030 = result.find((s) => new Date(s.time).getHours() === 10 && new Date(s.time).getMinutes() === 30);
    expect(slot10?.available).toBe(false);
    expect(slot1030?.available).toBe(false);
  });

  it("excludes slots during blocked times", async () => {
    const generateAvailableSlots = await importModule();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = localDateStr(futureDate);
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getDay();
    const blockStart = dateAtHour(dateStr, 11);
    const blockEnd = dateAtHour(dateStr, 12);

    db.serviceType.findUnique.mockResolvedValue({
      duration: 30,
      bufferAfter: 0,
      requiresOD: false,
    });
    db.provider.findMany.mockResolvedValue([
      {
        id: "prov-1",
        name: "Dr. Test",
        isOD: true,
        isActive: true,
        availability: [
          { id: "a1", providerId: "prov-1", dayOfWeek, startTime: "09:00", endTime: "13:00", isActive: true },
        ],
      },
    ]);
    db.appointment.findMany.mockResolvedValue([]);
    db.blockedTime.findMany.mockResolvedValue([
      { startAt: blockStart, endAt: blockEnd, providerId: "prov-1" },
    ]);

    const result = await generateAvailableSlots({
      dateStr,
      serviceTypeId: "st_eye_exam",
      includeBuffer: false,
    });

    // 11:00 and 11:30 should be blocked
    const slot11 = result.find((s) => new Date(s.time).getHours() === 11 && new Date(s.time).getMinutes() === 0);
    const slot1130 = result.find((s) => new Date(s.time).getHours() === 11 && new Date(s.time).getMinutes() === 30);
    expect(slot11?.available).toBe(false);
    expect(slot1130?.available).toBe(false);

    // 10:30 should still be available
    const slot1030 = result.find((s) => new Date(s.time).getHours() === 10 && new Date(s.time).getMinutes() === 30);
    expect(slot1030?.available).toBe(true);
  });

  it("clinic-wide block affects all providers", async () => {
    const generateAvailableSlots = await importModule();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = localDateStr(futureDate);
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getDay();
    const blockStart = dateAtHour(dateStr, 10);
    const blockEnd = dateAtHour(dateStr, 11);

    db.serviceType.findUnique.mockResolvedValue({
      duration: 30,
      bufferAfter: 0,
      requiresOD: false,
    });
    db.provider.findMany.mockResolvedValue([
      {
        id: "prov-1",
        name: "Provider 1",
        isOD: true,
        isActive: true,
        availability: [
          { id: "a1", providerId: "prov-1", dayOfWeek, startTime: "09:00", endTime: "12:00", isActive: true },
        ],
      },
      {
        id: "prov-2",
        name: "Provider 2",
        isOD: false,
        isActive: true,
        availability: [
          { id: "a2", providerId: "prov-2", dayOfWeek, startTime: "09:00", endTime: "12:00", isActive: true },
        ],
      },
    ]);
    db.appointment.findMany.mockResolvedValue([]);
    db.blockedTime.findMany.mockResolvedValue([
      { startAt: blockStart, endAt: blockEnd, providerId: null }, // clinic-wide
    ]);

    const result = await generateAvailableSlots({
      dateStr,
      serviceTypeId: "st_eye_exam",
      includeBuffer: false,
    });

    // Both providers' 10:00 and 10:30 slots should be blocked
    const blocked10 = result.filter(
      (s) => new Date(s.time).getHours() === 10 && new Date(s.time).getMinutes() === 0
    );
    expect(blocked10.every((s) => !s.available)).toBe(true);
  });

  it("filters by specific provider when providerId given", async () => {
    const generateAvailableSlots = await importModule();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = localDateStr(futureDate);
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getDay();

    db.serviceType.findUnique.mockResolvedValue({
      duration: 30,
      bufferAfter: 0,
      requiresOD: false,
    });
    db.provider.findMany.mockResolvedValue([
      {
        id: "prov-2",
        name: "Specific Provider",
        isOD: false,
        isActive: true,
        availability: [
          { id: "a2", providerId: "prov-2", dayOfWeek, startTime: "09:00", endTime: "11:00", isActive: true },
        ],
      },
    ]);
    db.appointment.findMany.mockResolvedValue([]);
    db.blockedTime.findMany.mockResolvedValue([]);

    const result = await generateAvailableSlots({
      dateStr,
      serviceTypeId: "st_styling",
      providerId: "prov-2",
      includeBuffer: false,
    });

    expect(result.every((s) => s.providerId === "prov-2")).toBe(true);
    expect(db.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "prov-2" }),
      })
    );
  });

  it("uses default duration when no serviceTypeId provided", async () => {
    const generateAvailableSlots = await importModule();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = localDateStr(futureDate);
    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getDay();

    db.provider.findMany.mockResolvedValue([
      {
        id: "prov-1",
        name: "Dr. Test",
        isOD: true,
        isActive: true,
        availability: [
          { id: "a1", providerId: "prov-1", dayOfWeek, startTime: "09:00", endTime: "10:00", isActive: true },
        ],
      },
    ]);
    db.appointment.findMany.mockResolvedValue([]);
    db.blockedTime.findMany.mockResolvedValue([]);

    const result = await generateAvailableSlots({ dateStr });

    // Default 30-min slots, 09:00-10:00 = 2 slots
    expect(result).toHaveLength(2);
  });

  it("only returns OD providers when service requiresOD", async () => {
    const generateAvailableSlots = await importModule();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = localDateStr(futureDate);

    db.serviceType.findUnique.mockResolvedValue({
      duration: 30,
      bufferAfter: 0,
      requiresOD: true,
    });
    db.provider.findMany.mockResolvedValue([]);
    db.appointment.findMany.mockResolvedValue([]);
    db.blockedTime.findMany.mockResolvedValue([]);

    await generateAvailableSlots({
      dateStr,
      serviceTypeId: "st_eye_exam",
    });

    expect(db.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isOD: true }),
      })
    );
  });
});
