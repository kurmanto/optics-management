"use server";

import { prisma } from "@/lib/prisma";
import { verifyClientSession } from "@/lib/client-dal";

export async function getFamilyOverview() {
  const session = await verifyClientSession();
  const { familyId } = session;

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: {
      id: true,
      name: true,
      tierLevel: true,
      tierPointsTotal: true,
      avatarUrl: true,
    },
  });

  if (!family) return null;

  // Members
  const members = await prisma.customer.findMany({
    where: { familyId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
    orderBy: { firstName: "asc" },
  });

  // Upcoming appointments (next 90 days)
  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const memberIds = members.map((m) => m.id);

  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      customerId: { in: memberIds },
      scheduledAt: { gte: now, lte: ninetyDays },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    select: {
      id: true,
      type: true,
      scheduledAt: true,
      customer: { select: { firstName: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  // Insurance policies — check for upcoming renewals
  const insurancePolicies = await prisma.insurancePolicy.findMany({
    where: {
      customerId: { in: memberIds },
      isActive: true,
    },
    select: {
      id: true,
      providerName: true,
      renewalMonth: true,
      renewalYear: true,
      eligibilityIntervalMonths: true,
      lastClaimDate: true,
      customer: { select: { firstName: true } },
    },
  });

  // Store credits
  const credits = await prisma.storeCredit.findMany({
    where: {
      customerId: { in: memberIds },
      isActive: true,
    },
    select: {
      amount: true,
      usedAmount: true,
    },
  });

  const totalCredit = credits.reduce((sum, c) => sum + (c.amount - c.usedAmount), 0);

  // Active orders (not PICKED_UP or CANCELLED)
  const activeOrders = await prisma.order.findMany({
    where: {
      customerId: { in: memberIds },
      status: { notIn: ["PICKED_UP", "CANCELLED", "DRAFT"] },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      type: true,
      frameBrand: true,
      frameModel: true,
      customer: { select: { firstName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Unlock card summary
  const unlockCards = await prisma.unlockCard.findMany({
    where: { familyId },
    select: { status: true },
  });

  const unlockSummary = {
    total: unlockCards.length,
    unlocked: unlockCards.filter((c) => c.status === "UNLOCKED").length,
    locked: unlockCards.filter((c) => c.status === "LOCKED").length,
  };

  return {
    family,
    members,
    upcomingAppointments,
    insurancePolicies,
    totalCredit,
    activeOrders,
    unlockSummary,
  };
}

export async function getMemberProfile(customerId: string) {
  const session = await verifyClientSession();
  const { familyId } = session;

  // Verify member belongs to family
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      email: true,
      phone: true,
      familyId: true,
      styleProfile: true,
    },
  });

  if (!customer || customer.familyId !== familyId) {
    return null;
  }

  // Exam timeline
  const exams = await prisma.exam.findMany({
    where: { customerId },
    select: {
      id: true,
      examDate: true,
      examType: true,
      doctorName: true,
      // Hidden: iop, va, clinicalNotes, billing fields
    },
    orderBy: { examDate: "desc" },
    take: 20,
  });

  // Current active prescription
  const currentRx = await prisma.prescription.findFirst({
    where: { customerId, isActive: true, source: "INTERNAL" },
    select: {
      id: true,
      date: true,
      type: true,
      doctorName: true,
      odSphere: true, odCylinder: true, odAxis: true, odAdd: true, odPd: true,
      osSphere: true, osCylinder: true, osAxis: true, osAdd: true, osPd: true,
      pdBinocular: true,
      expiryDate: true,
    },
    orderBy: { date: "desc" },
  });

  // Frame history (completed orders)
  const frameHistory = await prisma.order.findMany({
    where: {
      customerId,
      status: "PICKED_UP",
      frameBrand: { not: null },
    },
    select: {
      id: true,
      frameBrand: true,
      frameModel: true,
      frameColor: true,
      pickedUpAt: true,
    },
    orderBy: { pickedUpAt: "desc" },
    take: 10,
  });

  // Upcoming appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      customerId,
      scheduledAt: { gte: new Date() },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    select: {
      id: true,
      type: true,
      scheduledAt: true,
      status: true,
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  return {
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      dateOfBirth: customer.dateOfBirth,
      styleProfile: customer.styleProfile,
    },
    exams,
    currentRx,
    frameHistory,
    appointments,
  };
}

export async function getExamDetail(examId: string) {
  const session = await verifyClientSession();
  const { familyId } = session;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      examDate: true,
      examType: true,
      doctorName: true,
      // Hidden from clients: iop, va, clinicalNotes, billingCode, amountBilled, amountPaid, ohipCovered
      customer: {
        select: { id: true, firstName: true, lastName: true, familyId: true },
      },
      prescriptions: {
        select: {
          id: true,
          date: true,
          type: true,
          odSphere: true, odCylinder: true, odAxis: true, odAdd: true, odPd: true,
          osSphere: true, osCylinder: true, osAxis: true, osAdd: true, osPd: true,
          pdBinocular: true,
          isActive: true,
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!exam || exam.customer.familyId !== familyId) {
    return null;
  }

  // Get previous prescription for comparison
  const previousRx = await prisma.prescription.findFirst({
    where: {
      customerId: exam.customer.id,
      source: "INTERNAL",
      date: { lt: exam.examDate },
    },
    select: {
      id: true,
      date: true,
      odSphere: true, odCylinder: true, odAxis: true, odAdd: true, odPd: true,
      osSphere: true, osCylinder: true, osAxis: true, osAdd: true, osPd: true,
      pdBinocular: true,
    },
    orderBy: { date: "desc" },
  });

  return {
    exam: {
      id: exam.id,
      examDate: exam.examDate,
      examType: exam.examType,
      doctorName: exam.doctorName,
      customerName: `${exam.customer.firstName} ${exam.customer.lastName}`,
    },
    currentRx: exam.prescriptions[0] || null,
    previousRx,
  };
}

export async function getUnlockCards() {
  const session = await verifyClientSession();
  const { familyId } = session;

  const cards = await prisma.unlockCard.findMany({
    where: { familyId },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      imageUrl: true,
      status: true,
      value: true,
      valueType: true,
      progress: true,
      progressGoal: true,
      unlockedAt: true,
      expiresAt: true,
      customer: { select: { firstName: true } },
    },
    orderBy: [
      { status: "asc" }, // LOCKED first, then UNLOCKED, etc.
      { createdAt: "desc" },
    ],
  });

  return cards;
}

export async function getFamilyMembers() {
  const session = await verifyClientSession();
  const { familyId } = session;

  const members = await prisma.customer.findMany({
    where: { familyId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
    orderBy: { firstName: "asc" },
  });

  return members;
}
