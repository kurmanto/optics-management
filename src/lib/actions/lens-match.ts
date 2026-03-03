"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { getClientSession } from "@/lib/client-auth";
import { verifyClientSession } from "@/lib/client-dal";
import { awardPoints } from "@/lib/gamification";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendLensMatchEmail } from "@/lib/email";
import {
  LensQuizSubmissionSchema,
  LensMatchBookingSchema,
  LensMatchCallbackSchema,
} from "@/lib/validations/lens-match";
import { computeRecommendation, LENS_PACKAGES, type QuizAnswers } from "@/lib/utils/lens-packages";
import { AppointmentType } from "@prisma/client";
import { checkAndUnlockCards } from "@/lib/unlock-triggers";

export async function submitLensQuiz(input: unknown) {
  try {
    // Rate limit by IP
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    if (!checkRateLimit(`lens-match:${ip}`, 10)) {
      return { error: "Too many submissions. Please try again later." };
    }

    // Validate
    const parsed = LensQuizSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const data = parsed.data;
    const answers = data.answers as QuizAnswers;

    // Compute recommendation
    const recommendation = computeRecommendation(answers);

    // Optional: detect logged-in portal user (returns null for anonymous)
    let clientAccountId: string | null = null;
    let familyId: string | null = null;
    let customerId: string | null = null;
    try {
      const clientSession = await getClientSession();
      if (clientSession) {
        clientAccountId = clientSession.clientAccountId;
        familyId = clientSession.familyId;
        customerId = clientSession.primaryCustomerId ?? null;
      }
    } catch {
      // Anonymous user — ignore
    }

    // Create LensQuote record
    const quote = await prisma.lensQuote.create({
      data: {
        firstName: data.firstName,
        phone: data.phone || null,
        email: data.email || null,
        preferredTimeframe: data.preferredTimeframe || null,
        answers: data.answers,
        primaryPackageId: recommendation.primary.id,
        upgradePackageId: recommendation.upgrade?.id ?? null,
        alternativePackageId: recommendation.alternative?.id ?? null,
        clientAccountId,
        customerId,
        ipAddress: ip !== "unknown" ? ip : null,
        userAgent: headersList.get("user-agent") || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
      },
    });

    // Award points for portal users (fire-and-forget)
    if (familyId) {
      void awardPoints(familyId, 30, "Lens Match Quiz", quote.id, "LensQuote");
    }

    // Send email if provided (fire-and-forget)
    if (data.email) {
      void sendLensMatchEmail({
        to: data.email,
        firstName: data.firstName,
        packageName: recommendation.primary.name,
        priceRange: `$${recommendation.primary.priceMin}–$${recommendation.primary.priceMax}`,
        whyBullets: recommendation.whyBullets,
      }).then(() =>
        prisma.lensQuote.update({
          where: { id: quote.id },
          data: { emailSentAt: new Date() },
        })
      ).catch((err) => console.error("[sendLensMatchEmail]", err));
    }

    // Staff notification (fire-and-forget)
    void createNotification({
      type: "FORM_COMPLETED",
      title: "New Lens Match Lead",
      body: `${data.firstName} completed the Lens Match quiz — ${recommendation.primary.name}`,
      href: undefined,
    });

    // Audit log (fire-and-forget)
    void logAudit({
      action: "CREATE",
      model: "LensQuote",
      recordId: quote.id,
    });

    return { recommendation, quoteId: quote.id };
  } catch (err) {
    console.error("[submitLensQuiz]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Slot generation (shared logic) ──────────────────────────────────────────

const OPENING_HOUR = 9;
const CLOSING_HOUR = 18;
const SLOT_DURATION_MINUTES = 30;

async function generateSlots(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return [];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  if (date > maxDate) return [];

  const dayStart = new Date(date);
  dayStart.setHours(OPENING_HOUR, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(CLOSING_HOUR, 0, 0, 0);

  const existing = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
    select: { scheduledAt: true, duration: true },
  });

  const slots: { time: string; available: boolean }[] = [];
  const current = new Date(dayStart);

  while (current < dayEnd) {
    const slotTime = current.toISOString();
    const slotEnd = new Date(current.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

    const isBooked = existing.some((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60 * 1000);
      return current < aptEnd && slotEnd > aptStart;
    });

    const isPast = current < new Date();
    slots.push({ time: slotTime, available: !isBooked && !isPast });

    current.setMinutes(current.getMinutes() + SLOT_DURATION_MINUTES);
  }

  return slots;
}

// ─── Public slot endpoint (no auth required) ─────────────────────────────────

export async function getAvailableSlotsPublic(dateStr: string) {
  try {
    return await generateSlots(dateStr);
  } catch (err) {
    console.error("[getAvailableSlotsPublic]", err);
    return [];
  }
}

// ─── Build auto-notes from quiz data ─────────────────────────────────────────

function buildAutoNotes(quote: {
  firstName: string;
  phone: string | null;
  email: string | null;
  primaryPackageId: string;
  answers: unknown;
}): string {
  const pkg = LENS_PACKAGES.find((p) => p.id === quote.primaryPackageId);
  const pkgName = pkg ? `${pkg.name} ($${pkg.priceMin}–$${pkg.priceMax})` : quote.primaryPackageId;

  const answers = quote.answers as Record<string, string>;
  const answerSummary = Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const contact = [quote.firstName, quote.phone, quote.email].filter(Boolean).join(" | ");

  return `Lens Match Recommendation: ${pkgName}\nAnswers: ${answerSummary}\nContact: ${contact}`;
}

// ─── Book from Lens Match (logged-in portal users) ──────────────────────────

export async function bookLensMatchAppointment(input: unknown) {
  try {
    const session = await verifyClientSession();

    const parsed = LensMatchBookingSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { quoteId, customerId, type, scheduledAt: scheduledAtStr } = parsed.data;

    // Verify customer belongs to family
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, familyId: true, firstName: true },
    });

    if (!customer || customer.familyId !== session.familyId) {
      return { error: "Invalid family member selected." };
    }

    // Load quote
    const quote = await prisma.lensQuote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return { error: "Quiz results not found." };
    }

    // Verify slot availability
    const scheduledAt = new Date(scheduledAtStr);
    if (isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
      return { error: "Invalid or past date selected." };
    }

    const duration = type === "CONSULTATION" ? 15 : 30;
    const slotEnd = new Date(scheduledAt.getTime() + duration * 60 * 1000);

    const conflict = await prisma.appointment.findFirst({
      where: {
        scheduledAt: { lt: slotEnd },
        status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
        AND: {
          scheduledAt: { gte: new Date(scheduledAt.getTime() - SLOT_DURATION_MINUTES * 60 * 1000) },
        },
      },
    });

    if (conflict) {
      // Double-check: does the conflict actually overlap?
      const conflictEnd = new Date(conflict.scheduledAt.getTime() + conflict.duration * 60 * 1000);
      if (scheduledAt < conflictEnd && slotEnd > conflict.scheduledAt) {
        return { error: "This time slot is no longer available. Please choose another." };
      }
    }

    // Build notes from quiz data
    const notes = buildAutoNotes(quote);

    // Create appointment + link to quote
    const appointment = await prisma.appointment.create({
      data: {
        customerId,
        type: type as AppointmentType,
        scheduledAt,
        duration,
        notes,
      },
    });

    await prisma.lensQuote.update({
      where: { id: quoteId },
      data: {
        appointmentId: appointment.id,
        bookingClickedAt: new Date(),
      },
    });

    // Fire-and-forget side effects
    void logAudit({
      action: "CLIENT_BOOKING",
      model: "Appointment",
      recordId: appointment.id,
      changes: { customerId, type, bookedVia: "lens_match" },
    });

    void createNotification({
      type: "FORM_COMPLETED",
      title: "Lens Match Booking",
      body: `${customer.firstName} booked a ${type === "CONSULTATION" ? "lens consultation" : "eye exam"} from Lens Match results`,
    });

    void checkAndUnlockCards(session.familyId);
    void awardPoints(session.familyId, 25, "Lens Match Booking", appointment.id, "Appointment");

    return { success: true, appointmentId: appointment.id };
  } catch (err) {
    console.error("[bookLensMatchAppointment]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Request callback (anonymous users) ──────────────────────────────────────

export async function requestLensMatchCallback(input: unknown) {
  try {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    if (!checkRateLimit(`lens-callback:${ip}`, 5)) {
      return { error: "Too many requests. Please try again later." };
    }

    const parsed = LensMatchCallbackSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { quoteId, requestedType } = parsed.data;

    const quote = await prisma.lensQuote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return { error: "Quiz results not found." };
    }

    await prisma.lensQuote.update({
      where: { id: quoteId },
      data: {
        requestedAppointmentType: requestedType,
        callbackRequestedAt: new Date(),
        bookingClickedAt: new Date(),
      },
    });

    void createNotification({
      type: "FORM_COMPLETED",
      title: "Lens Match Callback Request",
      body: `${quote.firstName} wants a ${requestedType === "CONSULTATION" ? "lens consultation" : "eye exam"} — please contact ${quote.phone || quote.email || "them"}`,
    });

    return { success: true };
  } catch (err) {
    console.error("[requestLensMatchCallback]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
