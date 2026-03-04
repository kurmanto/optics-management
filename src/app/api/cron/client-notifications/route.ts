import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClientNotification } from "@/lib/client-notifications";
import { computeExamDueDate } from "@/lib/utils/exam-due";

/**
 * Daily cron job for proactive client notifications.
 * Intended to be called by Vercel Cron or external scheduler.
 *
 * Handles:
 * - EXAM_DUE_SOON: members with exam due within 90 days (no repeat within 30 days)
 * - APPOINTMENT_REMINDER: appointments within 24h (no repeat within 24h)
 * - BENEFIT_ELIGIBLE: insurance approaching eligibility (no repeat within 30 days)
 */
export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get all active client accounts
    const accounts = await prisma.clientAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        familyId: true,
        family: {
          select: {
            customers: {
              where: { isActive: true },
              select: {
                id: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    let examDueCount = 0;
    let appointmentCount = 0;
    let benefitCount = 0;

    for (const account of accounts) {
      const memberIds = account.family.customers.map((c) => c.id);

      // ── EXAM_DUE_SOON ──────────────────────────────────
      for (const member of account.family.customers) {
        // Check dedup: no EXAM_DUE_SOON for this customer in last 30 days
        const recentExamNotif = await prisma.clientNotification.findFirst({
          where: {
            clientAccountId: account.id,
            type: "EXAM_DUE_SOON",
            refId: member.id,
            createdAt: { gte: thirtyDaysAgo },
          },
        });
        if (recentExamNotif) continue;

        const [lastExam, activeRx, policy] = await Promise.all([
          prisma.exam.findFirst({
            where: { customerId: member.id },
            select: { examDate: true },
            orderBy: { examDate: "desc" },
          }),
          prisma.prescription.findFirst({
            where: { customerId: member.id, isActive: true, source: "INTERNAL" },
            select: { expiryDate: true },
            orderBy: { date: "desc" },
          }),
          prisma.insurancePolicy.findFirst({
            where: { customerId: member.id, isActive: true },
            select: { eligibilityIntervalMonths: true, lastClaimDate: true },
          }),
        ]);

        const due = computeExamDueDate({
          customerId: member.id,
          firstName: member.firstName,
          lastExamDate: lastExam?.examDate ?? null,
          rxExpiryDate: activeRx?.expiryDate ?? null,
          insuranceIntervalMonths: policy?.eligibilityIntervalMonths ?? null,
          lastClaimDate: policy?.lastClaimDate ?? null,
        });

        if (due.status === "DUE_SOON" || due.status === "OVERDUE") {
          void createClientNotification({
            clientAccountId: account.id,
            type: "EXAM_DUE_SOON",
            title: `Exam ${due.status === "OVERDUE" ? "Overdue" : "Due Soon"} — ${member.firstName}`,
            body: `${due.reason}. Book an appointment to stay on track with your vision care.`,
            href: "/my/book",
            refId: member.id,
            refType: "Customer",
          });
          examDueCount++;
        }
      }

      // ── APPOINTMENT_REMINDER ───────────────────────────
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          customerId: { in: memberIds },
          scheduledAt: { gte: now, lte: twentyFourHoursFromNow },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        select: {
          id: true,
          scheduledAt: true,
          type: true,
          customer: { select: { firstName: true } },
        },
      });

      for (const apt of upcomingAppointments) {
        // Dedup: no APPOINTMENT_REMINDER for this appointment in last 24h
        const recentReminder = await prisma.clientNotification.findFirst({
          where: {
            clientAccountId: account.id,
            type: "APPOINTMENT_REMINDER",
            refId: apt.id,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });
        if (recentReminder) continue;

        const time = new Date(apt.scheduledAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        const custName = apt.customer?.firstName ?? "Patient";
        void createClientNotification({
          clientAccountId: account.id,
          type: "APPOINTMENT_REMINDER",
          title: `Appointment Tomorrow — ${custName}`,
          body: `${custName} has a ${apt.type.toLowerCase().replace(/_/g, " ")} appointment at ${time}.`,
          href: "/my",
          refId: apt.id,
          refType: "Appointment",
        });
        appointmentCount++;
      }

      // ── BENEFIT_ELIGIBLE ───────────────────────────────
      const policies = await prisma.insurancePolicy.findMany({
        where: {
          customerId: { in: memberIds },
          isActive: true,
          lastClaimDate: { not: null },
          eligibilityIntervalMonths: { gt: 0 },
        },
        select: {
          id: true,
          lastClaimDate: true,
          eligibilityIntervalMonths: true,
          providerName: true,
          customer: { select: { id: true, firstName: true } },
        },
      });

      for (const policy of policies) {
        if (!policy.lastClaimDate || !policy.eligibilityIntervalMonths) continue;

        const eligibleDate = new Date(policy.lastClaimDate);
        eligibleDate.setMonth(eligibleDate.getMonth() + policy.eligibilityIntervalMonths);

        const daysUntil = Math.floor((eligibleDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 90 || daysUntil < -30) continue; // Only within 90 days or recently passed

        // Dedup
        const recentBenefit = await prisma.clientNotification.findFirst({
          where: {
            clientAccountId: account.id,
            type: "BENEFIT_ELIGIBLE",
            refId: policy.id,
            createdAt: { gte: thirtyDaysAgo },
          },
        });
        if (recentBenefit) continue;

        const statusText = daysUntil <= 0 ? "eligible now" : `eligible in ${daysUntil} days`;

        void createClientNotification({
          clientAccountId: account.id,
          type: "BENEFIT_ELIGIBLE",
          title: `Insurance Benefit ${daysUntil <= 0 ? "Ready" : "Coming Up"} — ${policy.customer.firstName}`,
          body: `${policy.customer.firstName}'s ${policy.providerName} benefit is ${statusText}. Don't miss out!`,
          href: "/my",
          refId: policy.id,
          refType: "InsurancePolicy",
        });
        benefitCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      sent: { examDue: examDueCount, appointment: appointmentCount, benefit: benefitCount },
    });
  } catch (err) {
    console.error("[cron/client-notifications] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
