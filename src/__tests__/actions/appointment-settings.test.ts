import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { PrismaMock } from "../mocks/prisma";
import { mockAdminSession } from "../mocks/session";

const db = prisma as unknown as PrismaMock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifySession).mockResolvedValue(mockAdminSession);
});

// ─── Service Types ───────────────────────────────────────────────────────────

describe("createServiceType", () => {
  it("creates a service type with valid data", async () => {
    const { createServiceType } = await import("@/lib/actions/appointment-settings");

    db.serviceType.findUnique.mockResolvedValue(null);
    db.serviceType.create.mockResolvedValue({ id: "st-new" });

    const result = await createServiceType({
      name: "New Service",
      slug: "new-service",
      duration: 45,
      bufferAfter: 10,
      color: "#FF0000",
      bgColor: "#FFF0F0",
      requiresOD: true,
      isPublicBookable: true,
      sortOrder: 1,
    });

    expect(result).toEqual({ id: "st-new" });
    expect(db.serviceType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "New Service", slug: "new-service", duration: 45 }),
    });
  });

  it("returns error for duplicate slug", async () => {
    const { createServiceType } = await import("@/lib/actions/appointment-settings");

    db.serviceType.findUnique.mockResolvedValue({ id: "existing" });

    const result = await createServiceType({
      name: "Duplicate",
      slug: "existing-slug",
      duration: 30,
    });

    expect(result).toEqual({ error: "A service type with this slug already exists" });
  });

  it("returns error for invalid data", async () => {
    const { createServiceType } = await import("@/lib/actions/appointment-settings");

    const result = await createServiceType({ name: "", slug: "" });
    expect(result).toHaveProperty("error");
  });

  it("returns error on prisma failure", async () => {
    const { createServiceType } = await import("@/lib/actions/appointment-settings");

    db.serviceType.findUnique.mockResolvedValue(null);
    db.serviceType.create.mockRejectedValue(new Error("DB error"));

    const result = await createServiceType({
      name: "Test",
      slug: "test",
      duration: 30,
    });

    expect(result).toEqual({ error: "Failed to create service type" });
  });
});

describe("updateServiceType", () => {
  it("updates a service type", async () => {
    const { updateServiceType } = await import("@/lib/actions/appointment-settings");

    db.serviceType.update.mockResolvedValue({ id: "st-1" });

    const result = await updateServiceType({ id: "st-1", name: "Updated Name" });
    expect(result).toEqual({ success: true });
    expect(db.serviceType.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "st-1" },
        data: expect.objectContaining({ name: "Updated Name" }),
      })
    );
  });

  it("returns error for missing id", async () => {
    const { updateServiceType } = await import("@/lib/actions/appointment-settings");
    const result = await updateServiceType({ name: "No ID" });
    expect(result).toHaveProperty("error");
  });
});

describe("toggleServiceType", () => {
  it("toggles service type active status", async () => {
    const { toggleServiceType } = await import("@/lib/actions/appointment-settings");

    db.serviceType.update.mockResolvedValue({ id: "st-1" });

    const result = await toggleServiceType("st-1", false);
    expect(result).toEqual({ success: true });
    expect(db.serviceType.update).toHaveBeenCalledWith({
      where: { id: "st-1" },
      data: { isActive: false },
    });
  });
});

// ─── Providers ───────────────────────────────────────────────────────────────

describe("createProvider", () => {
  it("creates a provider with valid data", async () => {
    const { createProvider } = await import("@/lib/actions/appointment-settings");

    db.provider.create.mockResolvedValue({ id: "prov-new" });

    const result = await createProvider({
      name: "Dr. Smith",
      title: "OD",
      isOD: true,
    });

    expect(result).toEqual({ id: "prov-new" });
    expect(db.provider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Dr. Smith", isOD: true }),
    });
  });

  it("returns error for invalid data", async () => {
    const { createProvider } = await import("@/lib/actions/appointment-settings");
    const result = await createProvider({ name: "" });
    expect(result).toHaveProperty("error");
  });
});

describe("updateProvider", () => {
  it("updates a provider", async () => {
    const { updateProvider } = await import("@/lib/actions/appointment-settings");

    db.provider.update.mockResolvedValue({ id: "prov-1" });

    const result = await updateProvider({ id: "prov-1", name: "Updated Name" });
    expect(result).toEqual({ success: true });
  });
});

describe("toggleProvider", () => {
  it("toggles provider active status", async () => {
    const { toggleProvider } = await import("@/lib/actions/appointment-settings");

    db.provider.update.mockResolvedValue({ id: "prov-1" });

    const result = await toggleProvider("prov-1", false);
    expect(result).toEqual({ success: true });
  });
});

// ─── Provider Availability ───────────────────────────────────────────────────

describe("setProviderAvailability", () => {
  it("upserts availability for a provider", async () => {
    const { setProviderAvailability } = await import("@/lib/actions/appointment-settings");

    db.providerAvailability.upsert.mockResolvedValue({ id: "avail-1" });

    const result = await setProviderAvailability({
      providerId: "prov-1",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    });

    expect(result).toEqual({ success: true });
    expect(db.providerAvailability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId_dayOfWeek: { providerId: "prov-1", dayOfWeek: 1 } },
      })
    );
  });

  it("returns error when start >= end", async () => {
    const { setProviderAvailability } = await import("@/lib/actions/appointment-settings");

    const result = await setProviderAvailability({
      providerId: "prov-1",
      dayOfWeek: 1,
      startTime: "17:00",
      endTime: "09:00",
    });

    expect(result).toEqual({ error: "Start time must be before end time" });
  });

  it("returns error for invalid time format", async () => {
    const { setProviderAvailability } = await import("@/lib/actions/appointment-settings");

    const result = await setProviderAvailability({
      providerId: "prov-1",
      dayOfWeek: 1,
      startTime: "9am",
      endTime: "5pm",
    });

    expect(result).toHaveProperty("error");
  });
});

describe("removeProviderAvailability", () => {
  it("removes availability for a day", async () => {
    const { removeProviderAvailability } = await import("@/lib/actions/appointment-settings");

    db.providerAvailability.delete.mockResolvedValue({});

    const result = await removeProviderAvailability("prov-1", 1);
    expect(result).toEqual({ success: true });
  });
});

// ─── Blocked Time ────────────────────────────────────────────────────────────

describe("createBlockedTime", () => {
  it("creates a blocked time entry", async () => {
    const { createBlockedTime } = await import("@/lib/actions/appointment-settings");

    db.blockedTime.create.mockResolvedValue({ id: "bt-1" });

    const result = await createBlockedTime({
      providerId: "prov-1",
      startAt: "2026-04-01T09:00:00Z",
      endAt: "2026-04-01T12:00:00Z",
      reason: "Lunch break",
    });

    expect(result).toEqual({ id: "bt-1" });
  });

  it("creates clinic-wide block when no provider", async () => {
    const { createBlockedTime } = await import("@/lib/actions/appointment-settings");

    db.blockedTime.create.mockResolvedValue({ id: "bt-2" });

    const result = await createBlockedTime({
      startAt: "2026-04-01T09:00:00Z",
      endAt: "2026-04-01T17:00:00Z",
      reason: "Clinic closed",
    });

    expect(result).toEqual({ id: "bt-2" });
    expect(db.blockedTime.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ providerId: null }),
    });
  });

  it("returns error when start >= end", async () => {
    const { createBlockedTime } = await import("@/lib/actions/appointment-settings");

    const result = await createBlockedTime({
      startAt: "2026-04-01T17:00:00Z",
      endAt: "2026-04-01T09:00:00Z",
    });

    expect(result).toEqual({ error: "Start must be before end" });
  });
});

describe("deleteBlockedTime", () => {
  it("deletes a blocked time", async () => {
    const { deleteBlockedTime } = await import("@/lib/actions/appointment-settings");

    db.blockedTime.delete.mockResolvedValue({});

    const result = await deleteBlockedTime("bt-1");
    expect(result).toEqual({ success: true });
  });
});

// ─── Appointment Settings ────────────────────────────────────────────────────

describe("getAppointmentSettings", () => {
  it("returns existing settings", async () => {
    const { getAppointmentSettings } = await import("@/lib/actions/appointment-settings");

    const settings = { id: "default", minCancelHours: 24 };
    db.appointmentSettings.findFirst.mockResolvedValue(settings);

    const result = await getAppointmentSettings();
    expect(result).toEqual(settings);
  });

  it("creates default settings when none exist", async () => {
    const { getAppointmentSettings } = await import("@/lib/actions/appointment-settings");

    db.appointmentSettings.findFirst.mockResolvedValue(null);
    db.appointmentSettings.create.mockResolvedValue({ id: "new-default", minCancelHours: 24 });

    const result = await getAppointmentSettings();
    expect(result).toEqual({ id: "new-default", minCancelHours: 24 });
  });
});

describe("updateAppointmentSettings", () => {
  it("updates cancellation policy", async () => {
    const { updateAppointmentSettings } = await import("@/lib/actions/appointment-settings");

    db.appointmentSettings.findFirst.mockResolvedValue({ id: "default", minCancelHours: 24 });
    db.appointmentSettings.update.mockResolvedValue({ id: "default", minCancelHours: 48 });

    const result = await updateAppointmentSettings({ minCancelHours: 48 });
    expect(result).toEqual({ success: true });
    expect(db.appointmentSettings.update).toHaveBeenCalledWith({
      where: { id: "default" },
      data: { minCancelHours: 48 },
    });
  });

  it("creates settings when updating non-existent", async () => {
    const { updateAppointmentSettings } = await import("@/lib/actions/appointment-settings");

    db.appointmentSettings.findFirst.mockResolvedValue(null);
    db.appointmentSettings.create.mockResolvedValue({ id: "new", minCancelHours: 72 });

    const result = await updateAppointmentSettings({ minCancelHours: 72 });
    expect(result).toEqual({ success: true });
  });

  it("returns error for invalid value", async () => {
    const { updateAppointmentSettings } = await import("@/lib/actions/appointment-settings");

    const result = await updateAppointmentSettings({ minCancelHours: -1 });
    expect(result).toHaveProperty("error");
  });
});

// ─── Read Actions ────────────────────────────────────────────────────────────

describe("getServiceTypes", () => {
  it("returns service types ordered by sortOrder", async () => {
    const { getServiceTypes } = await import("@/lib/actions/appointment-settings");

    const types = [{ id: "st-1", name: "Eye Exam" }];
    db.serviceType.findMany.mockResolvedValue(types);

    const result = await getServiceTypes();
    expect(result).toEqual(types);
    expect(db.serviceType.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: "asc" },
    });
  });
});

describe("getProviders", () => {
  it("returns providers with availability", async () => {
    const { getProviders } = await import("@/lib/actions/appointment-settings");

    const providers = [{ id: "prov-1", name: "Dr. Test", availability: [] }];
    db.provider.findMany.mockResolvedValue(providers);

    const result = await getProviders();
    expect(result).toEqual(providers);
  });
});

describe("getBlockedTimes", () => {
  it("returns blocked times with provider info", async () => {
    const { getBlockedTimes } = await import("@/lib/actions/appointment-settings");

    const times = [{ id: "bt-1", provider: { id: "prov-1", name: "Dr. Test" } }];
    db.blockedTime.findMany.mockResolvedValue(times);

    const result = await getBlockedTimes();
    expect(result).toEqual(times);
  });
});
