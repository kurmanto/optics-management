// Exam due date computation — pure function, no DB access

export type ExamDueStatus = "OVERDUE" | "DUE_SOON" | "OK" | "NO_DATA";

export type ExamDueInput = {
  customerId: string;
  firstName: string;
  lastExamDate: Date | null;
  rxExpiryDate: Date | null;
  insuranceIntervalMonths: number | null;
  lastClaimDate: Date | null;
};

export type ExamDueResult = {
  customerId: string;
  firstName: string;
  dueDate: Date | null;
  status: ExamDueStatus;
  reason: string;
};

const DUE_SOON_DAYS = 90;
const ANNUAL_MONTHS = 12;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeExamDueDate(input: ExamDueInput, now = new Date()): ExamDueResult {
  const candidates: { date: Date; reason: string }[] = [];

  // 1. Rx expiry date
  if (input.rxExpiryDate) {
    candidates.push({ date: input.rxExpiryDate, reason: "Prescription expires" });
  }

  // 2. Last exam + 12 months (annual cadence)
  if (input.lastExamDate) {
    candidates.push({
      date: addMonths(input.lastExamDate, ANNUAL_MONTHS),
      reason: "Annual exam due",
    });
  }

  // 3. Insurance claim date + eligibility interval
  if (input.lastClaimDate && input.insuranceIntervalMonths) {
    candidates.push({
      date: addMonths(input.lastClaimDate, input.insuranceIntervalMonths),
      reason: "Insurance benefit eligible",
    });
  }

  if (candidates.length === 0) {
    return {
      customerId: input.customerId,
      firstName: input.firstName,
      dueDate: null,
      status: "NO_DATA",
      reason: "No exam or prescription history",
    };
  }

  // Pick the earliest due date
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const earliest = candidates[0];
  const daysUntil = daysBetween(now, earliest.date);

  let status: ExamDueStatus;
  if (daysUntil < 0) {
    status = "OVERDUE";
  } else if (daysUntil <= DUE_SOON_DAYS) {
    status = "DUE_SOON";
  } else {
    status = "OK";
  }

  return {
    customerId: input.customerId,
    firstName: input.firstName,
    dueDate: earliest.date,
    status,
    reason: earliest.reason,
  };
}
