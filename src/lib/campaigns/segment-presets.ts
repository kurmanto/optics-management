import { CampaignType } from "@prisma/client";
import { SegmentDefinition } from "./segment-types";

export const SEGMENT_PRESETS: Partial<Record<CampaignType, SegmentDefinition>> = {
  EXAM_REMINDER: {
    logic: "AND",
    conditions: [
      { field: "daysSinceLastExam", operator: "between", value: 330, value2: 395 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 30,
  },

  WALKIN_FOLLOWUP: {
    logic: "AND",
    conditions: [
      { field: "hasWalkinQuoteNoOrder", operator: "eq", value: true },
      { field: "daysSinceWalkin", operator: "between", value: 7, value2: 60 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 14,
  },

  INSURANCE_RENEWAL: {
    logic: "AND",
    conditions: [
      { field: "hasActiveInsurance", operator: "eq", value: true },
      { field: "insuranceRenewalMonth", operator: "in", value: [10, 11, 12] },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 60,
  },

  ONE_TIME_BLAST: {
    logic: "AND",
    conditions: [],
    excludeMarketingOptOut: true,
  },

  SECOND_PAIR: {
    logic: "AND",
    conditions: [
      { field: "lifetimeOrderCount", operator: "eq", value: 1 },
      { field: "daysSinceLastOrder", operator: "between", value: 30, value2: 90 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 30,
  },

  PRESCRIPTION_EXPIRY: {
    logic: "AND",
    conditions: [
      { field: "rxExpiresInDays", operator: "between", value: 0, value2: 30 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 14,
  },

  ABANDONMENT_RECOVERY: {
    logic: "AND",
    conditions: [
      { field: "hasWalkinQuoteNoOrder", operator: "eq", value: true },
      { field: "daysSinceWalkin", operator: "gte", value: 7 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 7,
  },

  FAMILY_ADDON: {
    logic: "AND",
    conditions: [
      { field: "hasFamilyMembers", operator: "eq", value: true },
      { field: "lifetimeOrderCount", operator: "gte", value: 1 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 90,
  },

  INSURANCE_MAXIMIZATION: {
    logic: "AND",
    conditions: [
      { field: "hasActiveInsurance", operator: "eq", value: true },
      { field: "insuranceRenewalMonth", operator: "in", value: [10, 11, 12] },
      { field: "daysSinceLastOrder", operator: "gt", value: 300 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 30,
  },

  POST_PURCHASE_REFERRAL: {
    logic: "AND",
    conditions: [
      { field: "daysSinceLastOrder", operator: "between", value: 2, value2: 7 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 90,
  },

  VIP_INSIDER: {
    logic: "OR",
    conditions: [
      { field: "lifetimeOrderCount", operator: "gte", value: 3 },
      { field: "lifetimeSpend", operator: "gte", value: 2000 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 60,
  },

  DAMAGE_REPLACEMENT: {
    logic: "AND",
    conditions: [
      { field: "daysSinceLastOrder", operator: "between", value: 365, value2: 548 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 60,
  },

  BIRTHDAY_ANNIVERSARY: {
    logic: "AND",
    conditions: [
      { field: "birthdayMonth", operator: "eq", value: new Date().getMonth() + 1 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 365,
  },

  DORMANT_REACTIVATION: {
    logic: "AND",
    conditions: [
      { field: "daysSinceLastOrder", operator: "gte", value: 730 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 180,
  },

  COMPETITOR_SWITCHER: {
    logic: "AND",
    conditions: [
      { field: "hasExam", operator: "eq", value: true },
      { field: "lifetimeOrderCount", operator: "eq", value: 0 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 30,
  },

  LIFESTYLE_MARKETING: {
    logic: "AND",
    conditions: [
      { field: "primaryUse", operator: "is_not_null", value: null },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 90,
  },

  AGING_INVENTORY: {
    logic: "AND",
    conditions: [
      { field: "lifetimeOrderCount", operator: "gte", value: 1 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 60,
  },

  NEW_ARRIVAL_VIP: {
    logic: "OR",
    conditions: [
      { field: "lifetimeOrderCount", operator: "gte", value: 3 },
      { field: "lifetimeSpend", operator: "gte", value: 1500 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 14,
  },

  EDUCATIONAL_NURTURE: {
    logic: "AND",
    conditions: [
      { field: "lifetimeOrderCount", operator: "gte", value: 1 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 90,
  },

  LENS_EDUCATION: {
    logic: "AND",
    conditions: [
      { field: "lifetimeOrderCount", operator: "gte", value: 1 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 90,
  },

  STYLE_EVOLUTION: {
    logic: "AND",
    conditions: [
      { field: "daysSinceLastOrder", operator: "between", value: 180, value2: 730 },
    ],
    excludeMarketingOptOut: true,
    excludeRecentlyContacted: 60,
  },
};

export function getSegmentPreset(type: CampaignType): SegmentDefinition {
  return (
    SEGMENT_PRESETS[type] ?? {
      logic: "AND",
      conditions: [],
      excludeMarketingOptOut: true,
    }
  );
}
