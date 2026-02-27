import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClientSession } from "../mocks/client-session";

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendMagicLinkEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvoiceEmail: vi.fn(),
  sendIntakeEmail: vi.fn(),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifyClientSession } = await import("@/lib/client-dal");
  vi.mocked(verifyClientSession).mockResolvedValue(mockClientSession);
});

describe("getAvailableSlots", () => {
  it("returns slots for a valid future date", async () => {
    const { getAvailableSlots } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    // Use a date 7 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    const result = await getAvailableSlots(dateStr, "EYE_EXAM");

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => typeof s.time === "string")).toBe(true);
    expect(result.every((s) => typeof s.available === "boolean")).toBe(true);
  });

  it("returns empty for past dates", async () => {
    const { getAvailableSlots } = await import("@/lib/actions/client-booking");

    const result = await getAvailableSlots("2020-01-01", "EYE_EXAM");
    expect(result).toEqual([]);
  });

  it("returns empty for invalid dates", async () => {
    const { getAvailableSlots } = await import("@/lib/actions/client-booking");

    const result = await getAvailableSlots("not-a-date", "EYE_EXAM");
    expect(result).toEqual([]);
  });

  it("marks booked slots as unavailable", async () => {
    const { getAvailableSlots } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    // Get all slots first to know what times exist, then book the first one
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);
    const allSlots = await getAvailableSlots(dateStr, "EYE_EXAM");
    const firstAvailableSlot = allSlots.find((s) => s.available);

    if (firstAvailableSlot) {
      // Now mock a booking at that time
      const bookedTime = new Date(firstAvailableSlot.time);
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([
        { scheduledAt: bookedTime, duration: 30 },
      ] as any);

      const result = await getAvailableSlots(dateStr, "EYE_EXAM");
      const matchingSlot = result.find((s) => s.time === firstAvailableSlot.time);
      expect(matchingSlot?.available).toBe(false);
    }
  });
});

describe("bookAppointment", () => {
  it("creates appointment for valid family member", async () => {
    const { bookAppointment } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "customer-1",
      familyId: "family-1",
    } as any);

    // No conflicts
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockResolvedValue({
      id: "apt-new",
    } as any);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(10, 0, 0, 0);

    const formData = new FormData();
    formData.set("customerId", "customer-1");
    formData.set("type", "EYE_EXAM");
    formData.set("scheduledAt", futureDate.toISOString());

    const result = await bookAppointment(null, formData);

    expect(result.success).toBe(true);
    expect(result.appointmentId).toBe("apt-new");
    expect(vi.mocked(prisma.appointment.create)).toHaveBeenCalled();
  });

  it("rejects booking for non-family member", async () => {
    const { bookAppointment } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "customer-other",
      familyId: "family-other",
    } as any);

    const formData = new FormData();
    formData.set("customerId", "customer-other");
    formData.set("type", "EYE_EXAM");
    formData.set("scheduledAt", new Date(Date.now() + 86400000).toISOString());

    const result = await bookAppointment(null, formData);

    expect(result.error).toBe("Invalid family member selected.");
  });

  it("rejects booking in the past", async () => {
    const { bookAppointment } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "customer-1",
      familyId: "family-1",
    } as any);

    const formData = new FormData();
    formData.set("customerId", "customer-1");
    formData.set("type", "EYE_EXAM");
    formData.set("scheduledAt", "2020-01-01T10:00:00Z");

    const result = await bookAppointment(null, formData);

    expect(result.error).toBe("Invalid or past date selected.");
  });

  it("rejects when slot is taken", async () => {
    const { bookAppointment } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: "customer-1",
      familyId: "family-1",
    } as any);

    // Conflict exists
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({ id: "conflict" } as any);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const formData = new FormData();
    formData.set("customerId", "customer-1");
    formData.set("type", "EYE_EXAM");
    formData.set("scheduledAt", futureDate.toISOString());

    const result = await bookAppointment(null, formData);

    expect(result.error).toContain("no longer available");
  });

  it("validates missing fields", async () => {
    const { bookAppointment } = await import("@/lib/actions/client-booking");

    const formData = new FormData();
    formData.set("customerId", "");
    formData.set("type", "EYE_EXAM");
    formData.set("scheduledAt", "");

    const result = await bookAppointment(null, formData);
    expect(result.error).toBeDefined();
  });
});

describe("cancelAppointment", () => {
  it("cancels a scheduled appointment", async () => {
    const { cancelAppointment } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      status: "SCHEDULED",
      customer: { familyId: "family-1" },
    } as any);
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as any);

    const result = await cancelAppointment("apt-1");

    expect(result.error).toBeUndefined();
    expect(vi.mocked(prisma.appointment.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "apt-1" },
        data: { status: "CANCELLED" },
      })
    );
  });

  it("rejects cancellation for other family's appointment", async () => {
    const { cancelAppointment } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-other",
      status: "SCHEDULED",
      customer: { familyId: "family-other" },
    } as any);

    const result = await cancelAppointment("apt-other");
    expect(result.error).toBe("Appointment not found.");
  });

  it("rejects cancellation of completed appointment", async () => {
    const { cancelAppointment } = await import("@/lib/actions/client-booking");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      status: "COMPLETED",
      customer: { familyId: "family-1" },
    } as any);

    const result = await cancelAppointment("apt-1");
    expect(result.error).toBe("This appointment cannot be cancelled.");
  });
});
