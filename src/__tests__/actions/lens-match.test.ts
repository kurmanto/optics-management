import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock email module (not globally mocked in setup.ts)
vi.mock("@/lib/email", () => ({
  sendLensMatchEmail: vi.fn().mockResolvedValue({ id: "email-1" }),
}));

// Mock rate-limit (not globally mocked in setup.ts)
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

// Mock audit (not globally mocked in setup.ts)
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock unlock-triggers
vi.mock("@/lib/unlock-triggers", () => ({
  checkAndUnlockCards: vi.fn(),
}));

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

const validInput = {
  answers: {
    primaryUse: "WORK_SCREENS",
    wearTime: "HEAVY",
    frustration: "HEADACHES",
    currentGlasses: "YES_SINGLE",
    sunglasses: "NOT_NOW",
    hasBenefits: "YES",
  },
  firstName: "Jane",
  email: "jane@example.com",
  phone: "",
  preferredTimeframe: "This week",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
};

const mockClientSession = {
  clientAccountId: "client-1",
  email: "jane@example.com",
  familyId: "fam-1",
  primaryCustomerId: "cust-1",
  name: "Jane",
  phone: null,
};

beforeEach(async () => {
  vi.clearAllMocks();

  // Re-establish mock implementations after clearAllMocks
  const { getClientSession } = await import("@/lib/client-auth");
  vi.mocked(getClientSession).mockResolvedValue(null);

  const { checkRateLimit } = await import("@/lib/rate-limit");
  vi.mocked(checkRateLimit).mockReturnValue(true);

  const { sendLensMatchEmail } = await import("@/lib/email");
  vi.mocked(sendLensMatchEmail).mockResolvedValue({ id: "email-1" } as any);

  const { logAudit } = await import("@/lib/audit");
  vi.mocked(logAudit).mockResolvedValue(undefined);

  const { verifyClientSession } = await import("@/lib/client-dal");
  vi.mocked(verifyClientSession).mockResolvedValue(mockClientSession as any);
});

describe("submitLensQuiz", () => {
  it("returns recommendation and quoteId on valid input", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.create.mockResolvedValue({ id: "quote-1" });

    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz(validInput);

    expect(result).toHaveProperty("recommendation");
    expect(result).toHaveProperty("quoteId", "quote-1");
    expect(prisma.lensQuote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Jane",
          email: "jane@example.com",
          primaryPackageId: expect.any(String),
        }),
      })
    );
  });

  it("returns error when firstName is missing", async () => {
    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz({ ...validInput, firstName: "" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when no phone or email provided", async () => {
    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz({ ...validInput, email: "", phone: "" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when answers are invalid", async () => {
    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz({
      ...validInput,
      answers: { primaryUse: "INVALID" },
    });
    expect(result).toHaveProperty("error");
  });

  it("returns error when input is null", async () => {
    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz(null);
    expect(result).toHaveProperty("error");
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.create.mockRejectedValue(new Error("DB error"));

    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz(validInput);
    expect(result).toHaveProperty("error");
  });

  it("returns error when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz(validInput);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("Too many");
  });

  it("sends email when email is provided", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.create.mockResolvedValue({ id: "quote-2" });

    const { sendLensMatchEmail } = await import("@/lib/email");
    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz(validInput);

    expect(result).toHaveProperty("quoteId");
    // Flush microtasks for fire-and-forget
    await new Promise((r) => process.nextTick(r));
    expect(sendLensMatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@example.com",
        firstName: "Jane",
        packageName: expect.any(String),
        priceRange: expect.any(String),
        whyBullets: expect.any(Array),
      })
    );
  });

  it("creates staff notification", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.create.mockResolvedValue({ id: "quote-3" });

    const { createNotification } = await import("@/lib/notifications");
    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz(validInput);

    expect(result).toHaveProperty("quoteId");
    await new Promise((r) => process.nextTick(r));
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FORM_COMPLETED",
        title: "New Lens Match Lead",
      })
    );
  });

  it("accepts phone-only submission (no email)", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.create.mockResolvedValue({ id: "quote-4" });

    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz({
      ...validInput,
      email: "",
      phone: "6476485809",
    });
    expect(result).toHaveProperty("quoteId");

    await new Promise((r) => process.nextTick(r));
    const { sendLensMatchEmail } = await import("@/lib/email");
    expect(sendLensMatchEmail).not.toHaveBeenCalled();
  });

  it("awards points for portal user", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.create.mockResolvedValue({ id: "quote-5" });

    const { getClientSession } = await import("@/lib/client-auth");
    vi.mocked(getClientSession).mockResolvedValue({
      id: "client-1",
      email: "jane@example.com",
      familyId: "fam-1",
      primaryCustomerId: "cust-1",
      name: "Jane",
      phone: null,
    } as any);

    const { awardPoints } = await import("@/lib/gamification");
    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz(validInput);

    expect(result).toHaveProperty("quoteId");
    await new Promise((r) => process.nextTick(r));
    expect(awardPoints).toHaveBeenCalledWith(
      "fam-1", 30, "Lens Match Quiz", "quote-5", "LensQuote"
    );
  });

  it("stores UTM params when provided", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.create.mockResolvedValue({ id: "quote-6" });

    const { submitLensQuiz } = await import("@/lib/actions/lens-match");
    const result = await submitLensQuiz({
      ...validInput,
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "spring-2026",
    });

    expect(result).toHaveProperty("quoteId");
    expect(prisma.lensQuote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "spring-2026",
        }),
      })
    );
  });
});

describe("bookLensMatchAppointment", () => {
  const mockQuote = {
    id: "quote-1",
    firstName: "Jane",
    phone: "6476485809",
    email: "jane@example.com",
    primaryPackageId: "SV_PREMIUM",
    answers: { primaryUse: "WORK_SCREENS", wearTime: "HEAVY" },
  };

  it("creates appointment and links to quote on valid input", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "cust-1",
      familyId: "fam-1",
      firstName: "Jane",
    });
    prisma.lensQuote.findUnique.mockResolvedValue(mockQuote);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.appointment.create.mockResolvedValue({ id: "apt-1" });
    prisma.lensQuote.update.mockResolvedValue({});

    const { bookLensMatchAppointment } = await import("@/lib/actions/lens-match");
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();
    const result = await bookLensMatchAppointment({
      quoteId: "quote-1",
      customerId: "cust-1",
      type: "CONSULTATION",
      scheduledAt,
    });

    expect(result).toEqual({ success: true, appointmentId: "apt-1" });
    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: "cust-1",
          type: "CONSULTATION",
          duration: 15,
          notes: expect.stringContaining("Lens Match Recommendation"),
        }),
      })
    );
    expect(prisma.lensQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "quote-1" },
        data: expect.objectContaining({ appointmentId: "apt-1" }),
      })
    );
  });

  it("uses 30-min duration for EYE_EXAM", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "cust-1",
      familyId: "fam-1",
      firstName: "Jane",
    });
    prisma.lensQuote.findUnique.mockResolvedValue(mockQuote);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.appointment.create.mockResolvedValue({ id: "apt-2" });
    prisma.lensQuote.update.mockResolvedValue({});

    const { bookLensMatchAppointment } = await import("@/lib/actions/lens-match");
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();
    const result = await bookLensMatchAppointment({
      quoteId: "quote-1",
      customerId: "cust-1",
      type: "EYE_EXAM",
      scheduledAt,
    });

    expect(result).toEqual({ success: true, appointmentId: "apt-2" });
    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ duration: 30 }),
      })
    );
  });

  it("returns error when customer not in family", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "cust-other",
      familyId: "fam-other",
      firstName: "Other",
    });

    const { bookLensMatchAppointment } = await import("@/lib/actions/lens-match");
    const result = await bookLensMatchAppointment({
      quoteId: "quote-1",
      customerId: "cust-other",
      type: "CONSULTATION",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(result).toHaveProperty("error", "Invalid family member selected.");
  });

  it("returns error when quote not found", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "cust-1",
      familyId: "fam-1",
      firstName: "Jane",
    });
    prisma.lensQuote.findUnique.mockResolvedValue(null);

    const { bookLensMatchAppointment } = await import("@/lib/actions/lens-match");
    const result = await bookLensMatchAppointment({
      quoteId: "bad-id",
      customerId: "cust-1",
      type: "CONSULTATION",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(result).toHaveProperty("error", "Quiz results not found.");
  });

  it("returns error on invalid input", async () => {
    const { bookLensMatchAppointment } = await import("@/lib/actions/lens-match");
    const result = await bookLensMatchAppointment({ quoteId: "", customerId: "", type: "BAD", scheduledAt: "" });
    expect(result).toHaveProperty("error");
  });

  it("auto-generates notes containing package name", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "cust-1",
      familyId: "fam-1",
      firstName: "Jane",
    });
    prisma.lensQuote.findUnique.mockResolvedValue(mockQuote);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.appointment.create.mockResolvedValue({ id: "apt-3" });
    prisma.lensQuote.update.mockResolvedValue({});

    const { bookLensMatchAppointment } = await import("@/lib/actions/lens-match");
    await bookLensMatchAppointment({
      quoteId: "quote-1",
      customerId: "cust-1",
      type: "CONSULTATION",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const createCall = prisma.appointment.create.mock.calls[0][0];
    expect(createCall.data.notes).toContain("Digital Comfort");
    expect(createCall.data.notes).toContain("$275");
  });
});

describe("requestLensMatchCallback", () => {
  it("updates quote with callback request", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.findUnique.mockResolvedValue({
      id: "quote-1",
      firstName: "Jane",
      phone: "6476485809",
      email: "jane@example.com",
    });
    prisma.lensQuote.update.mockResolvedValue({});

    const { requestLensMatchCallback } = await import("@/lib/actions/lens-match");
    const result = await requestLensMatchCallback({
      quoteId: "quote-1",
      requestedType: "CONSULTATION",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.lensQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "quote-1" },
        data: expect.objectContaining({
          requestedAppointmentType: "CONSULTATION",
          callbackRequestedAt: expect.any(Date),
        }),
      })
    );
  });

  it("creates staff notification with contact info", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.findUnique.mockResolvedValue({
      id: "quote-1",
      firstName: "Jane",
      phone: "6476485809",
      email: null,
    });
    prisma.lensQuote.update.mockResolvedValue({});

    const { createNotification } = await import("@/lib/notifications");
    const { requestLensMatchCallback } = await import("@/lib/actions/lens-match");
    await requestLensMatchCallback({ quoteId: "quote-1", requestedType: "EYE_EXAM" });

    await new Promise((r) => process.nextTick(r));
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FORM_COMPLETED",
        title: "Lens Match Callback Request",
        body: expect.stringContaining("6476485809"),
      })
    );
  });

  it("returns error when quote not found", async () => {
    const prisma = await getPrisma();
    prisma.lensQuote.findUnique.mockResolvedValue(null);

    const { requestLensMatchCallback } = await import("@/lib/actions/lens-match");
    const result = await requestLensMatchCallback({
      quoteId: "bad-id",
      requestedType: "CONSULTATION",
    });

    expect(result).toHaveProperty("error", "Quiz results not found.");
  });

  it("returns error when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const { requestLensMatchCallback } = await import("@/lib/actions/lens-match");
    const result = await requestLensMatchCallback({
      quoteId: "quote-1",
      requestedType: "CONSULTATION",
    });

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("Too many");
  });

  it("returns error on invalid input", async () => {
    const { requestLensMatchCallback } = await import("@/lib/actions/lens-match");
    const result = await requestLensMatchCallback({ quoteId: "", requestedType: "BAD" });
    expect(result).toHaveProperty("error");
  });
});

describe("getAvailableSlotsPublic", () => {
  it("returns slots for a valid future date", async () => {
    const prisma = await getPrisma();
    prisma.appointment.findMany.mockResolvedValue([]);

    const { getAvailableSlotsPublic } = await import("@/lib/actions/lens-match");
    // Use a date 3 days out to avoid timezone edge cases
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateStr = futureDate.toISOString().split("T")[0];
    const slots = await getAvailableSlotsPublic(dateStr);

    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
    // With no existing appointments and a future date, at least some slots should be available
    const availableSlots = slots.filter((s: { available: boolean }) => s.available);
    expect(availableSlots.length).toBeGreaterThan(0);
  });

  it("returns empty array for invalid date", async () => {
    const { getAvailableSlotsPublic } = await import("@/lib/actions/lens-match");
    const slots = await getAvailableSlotsPublic("invalid-date");
    expect(slots).toEqual([]);
  });

  it("marks conflicting slots as unavailable", async () => {
    const prisma = await getPrisma();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    prisma.appointment.findMany.mockResolvedValue([
      { scheduledAt: tomorrow, duration: 30 },
    ]);

    const { getAvailableSlotsPublic } = await import("@/lib/actions/lens-match");
    const dateStr = tomorrow.toISOString().split("T")[0];
    const slots = await getAvailableSlotsPublic(dateStr);

    // The 10:00 AM slot should be unavailable
    const tenAm = slots.find((s: { time: string }) =>
      new Date(s.time).getHours() === 10 && new Date(s.time).getMinutes() === 0
    );
    if (tenAm) {
      expect(tenAm.available).toBe(false);
    }
  });
});
