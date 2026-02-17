import { OrderStatus, OrderType } from "@prisma/client";

type OrderSummary = {
  status: OrderStatus;
  type: OrderType;
  totalReal: number;
  balanceReal: number;
  createdAt: Date;
  pickedUpAt?: Date | null;
};

type InsurancePolicySummary = {
  lastClaimDate?: Date | null;
  eligibilityIntervalMonths: number;
};

export type CustomerType = "LEAD" | "NEW" | "ACTIVE" | "LAPSED" | "DORMANT" | "VIP";

const PICKED_UP_STATUSES: OrderStatus[] = ["PICKED_UP"];

function getPickedUpOrders(orders: OrderSummary[]) {
  return orders.filter((o) => o.status === "PICKED_UP");
}

export function computeLTV(orders: OrderSummary[]): number {
  return getPickedUpOrders(orders).reduce((sum, o) => sum + o.totalReal, 0);
}

export function computeOutstandingBalance(orders: OrderSummary[]): number {
  return orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "PICKED_UP")
    .reduce((sum, o) => sum + o.balanceReal, 0);
}

export function computeCustomerType(
  orders: OrderSummary[],
  createdAt: Date
): CustomerType {
  const pickedUp = getPickedUpOrders(orders);
  const ltv = computeLTV(orders);

  if (ltv >= 1500 || pickedUp.length >= 3) return "VIP";
  if (pickedUp.length === 0) return "LEAD";

  const lastPickedUp = pickedUp.reduce(
    (latest, o) => {
      const date = o.pickedUpAt ?? o.createdAt;
      return date > latest ? date : latest;
    },
    new Date(0)
  );

  const now = new Date();
  const daysSinceLastPickup = (now.getTime() - lastPickedUp.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastPickup <= 90) {
    const firstPickedUp = pickedUp.reduce(
      (earliest, o) => {
        const date = o.pickedUpAt ?? o.createdAt;
        return date < earliest ? date : earliest;
      },
      new Date()
    );
    const daysSinceFirst = (now.getTime() - firstPickedUp.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceFirst <= 90) return "NEW";
  }

  if (daysSinceLastPickup <= 24 * 30) return "ACTIVE";
  if (daysSinceLastPickup <= 36 * 30) return "LAPSED";
  return "DORMANT";
}

export function computeInsuranceEligibility(policy: InsurancePolicySummary): {
  nextDate: Date | null;
  daysUntil: number | null;
  isEligibleSoon: boolean;
} {
  if (!policy.lastClaimDate) {
    return { nextDate: null, daysUntil: null, isEligibleSoon: false };
  }

  const nextDate = new Date(policy.lastClaimDate);
  nextDate.setMonth(nextDate.getMonth() + policy.eligibilityIntervalMonths);

  const now = new Date();
  const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    nextDate,
    daysUntil,
    isEligibleSoon: daysUntil <= 90,
  };
}

export function isUnder21(dob: Date | null | undefined): boolean {
  if (!dob) return false;
  const now = new Date();
  const age = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return age < 21;
}

export function hasExamOnlyHistory(orders: OrderSummary[]): boolean {
  const paidOrders = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "DRAFT");
  if (paidOrders.length === 0) return false;
  return paidOrders.every((o) => o.type === "EXAM_ONLY");
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  LEAD: "Lead",
  NEW: "New",
  ACTIVE: "Active",
  LAPSED: "Lapsed",
  DORMANT: "Dormant",
  VIP: "VIP",
};

export const CUSTOMER_TYPE_COLORS: Record<CustomerType, string> = {
  LEAD: "bg-gray-100 text-gray-600",
  NEW: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  LAPSED: "bg-amber-100 text-amber-700",
  DORMANT: "bg-red-100 text-red-700",
  VIP: "bg-purple-100 text-purple-700",
};

export const HEAR_ABOUT_US_LABELS: Record<string, string> = {
  GOOGLE: "Google",
  INSTAGRAM: "Instagram",
  WALK_BY: "Walk-by",
  REFERRAL: "Referral",
  RETURNING: "Returning patient",
  DOCTOR_REFERRAL: "Doctor referral",
  OTHER: "Other",
};
