import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

const validApptData = {
  customerId: "cust-1",
  type: "STYLING",
  scheduledAt: "2026-03-15T10:00:00.000Z",
  duration: 30,
};

describe("createAppointment", () => {
  it("returns error when scheduledAt is missing", async () => {
    const { createAppointment } = await import("@/lib/actions/appointments");
    const result = await createAppointment({ ...validApptData, scheduledAt: "" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when customerId is missing", async () => {
    const { createAppointment } = await import("@/lib/actions/appointments");
    const result = await createAppointment({ ...validApptData, customerId: "" });
    expect(result).toHaveProperty("error");
  });

  it("creates appointment on valid data", async () => {
    const prisma = await getPrisma();
    prisma.appointment.create.mockResolvedValue({ id: "appt-1" });

    const { createAppointment } = await import("@/lib/actions/appointments");
    const result = await createAppointment(validApptData);
    expect(result).toEqual({ id: "appt-1" });
    expect(prisma.appointment.create).toHaveBeenCalled();
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.appointment.create.mockRejectedValue(new Error("DB error"));

    const { createAppointment } = await import("@/lib/actions/appointments");
    const result = await createAppointment(validApptData);
    expect(result).toHaveProperty("error");
  });
});

describe("updateAppointmentStatus", () => {
  it("returns error when appointment not found", async () => {
    const prisma = await getPrisma();
    prisma.appointment.findUnique.mockResolvedValue(null);

    const { updateAppointmentStatus } = await import("@/lib/actions/appointments");
    const result = await updateAppointmentStatus("appt-1", "CANCELLED" as any);
    expect((result as any).error).toBe("Appointment not found");
  });

  it("updates status successfully", async () => {
    const prisma = await getPrisma();
    prisma.appointment.findUnique.mockResolvedValue({ customerId: "cust-1" });
    prisma.appointment.update.mockResolvedValue({});

    const { updateAppointmentStatus } = await import("@/lib/actions/appointments");
    const result = await updateAppointmentStatus("appt-1", "COMPLETED" as any);
    expect(result).toEqual({ success: true });
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "appt-1" } })
    );
  });
});

describe("getUpcomingAppointments", () => {
  it("calls findMany with scheduledAt >= now and status NOT CANCELLED, returns results", async () => {
    const prisma = await getPrisma();
    const mockAppts = [
      { id: "appt-1", customerId: "cust-1", type: "STYLING", scheduledAt: new Date(Date.now() + 86400000) },
    ];
    prisma.appointment.findMany.mockResolvedValue(mockAppts);

    const before = new Date();
    const { getUpcomingAppointments } = await import("@/lib/actions/appointments");
    const result = await getUpcomingAppointments("cust-1");

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: "cust-1",
          scheduledAt: expect.objectContaining({ gte: expect.any(Date) }),
          status: expect.objectContaining({ not: "CANCELLED" }),
        }),
      })
    );
    const callArgs = prisma.appointment.findMany.mock.calls[0][0] as { where: { scheduledAt: { gte: Date } } };
    expect(callArgs.where.scheduledAt.gte.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("appt-1");
  });

  it("returns [] when findMany returns empty array", async () => {
    const prisma = await getPrisma();
    prisma.appointment.findMany.mockResolvedValue([]);

    const { getUpcomingAppointments } = await import("@/lib/actions/appointments");
    const result = await getUpcomingAppointments("cust-empty");
    expect(result).toEqual([]);
  });
});

describe("cancelAppointment", () => {
  it("delegates to updateAppointmentStatus with CANCELLED", async () => {
    const prisma = await getPrisma();
    prisma.appointment.findUnique.mockResolvedValue({ customerId: "cust-1" });
    prisma.appointment.update.mockResolvedValue({});

    const { cancelAppointment } = await import("@/lib/actions/appointments");
    const result = await cancelAppointment("appt-1");
    expect(result).toEqual({ success: true });
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CANCELLED" } })
    );
  });
});
