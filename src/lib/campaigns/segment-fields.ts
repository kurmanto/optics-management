/**
 * Registry of abstract segment field names mapped to SQL/Prisma query logic.
 * Each field definition describes what data it evaluates and how to build the where clause.
 */

export interface FieldDefinition {
  label: string;
  description: string;
  type: "number" | "date" | "boolean" | "string" | "enum";
  operators: string[];
  sqlFragment?: string; // Raw SQL for complex date math (used with $queryRaw)
  prismaPath?: string; // Simple prisma where path for basic fields
}

export const SEGMENT_FIELDS: Record<string, FieldDefinition> = {
  // ── Customer basics ──────────────────────────────────────
  age: {
    label: "Customer Age",
    description: "Age in years based on date of birth",
    type: "number",
    operators: ["gt", "gte", "lt", "lte", "between"],
    sqlFragment: "EXTRACT(YEAR FROM AGE(NOW(), c.\"dateOfBirth\"))",
  },
  birthdayMonth: {
    label: "Birthday Month",
    description: "Month number of customer's birthday (1-12)",
    type: "number",
    operators: ["eq", "in"],
    sqlFragment: "EXTRACT(MONTH FROM c.\"dateOfBirth\")",
  },
  gender: {
    label: "Gender",
    description: "Customer gender",
    type: "enum",
    operators: ["eq", "in"],
    prismaPath: "gender",
  },
  city: {
    label: "City",
    description: "Customer city",
    type: "string",
    operators: ["eq", "contains"],
    prismaPath: "city",
  },
  tags: {
    label: "Customer Tags",
    description: "Custom tags applied to the customer",
    type: "string",
    operators: ["contains", "in"],
    prismaPath: "tags",
  },
  isOnboarded: {
    label: "Is Onboarded",
    description: "Whether customer has completed intake forms",
    type: "boolean",
    operators: ["eq"],
    prismaPath: "isOnboarded",
  },

  // ── Order history ─────────────────────────────────────────
  lifetimeOrderCount: {
    label: "Lifetime Order Count",
    description: "Total number of completed orders",
    type: "number",
    operators: ["gt", "gte", "lt", "lte", "eq", "between"],
    sqlFragment: "(SELECT COUNT(*) FROM orders o WHERE o.\"customerId\"=c.id AND o.status='PICKED_UP')",
  },
  lifetimeSpend: {
    label: "Lifetime Spend",
    description: "Total spend across all picked up orders ($CAD)",
    type: "number",
    operators: ["gt", "gte", "lt", "lte", "between"],
    sqlFragment: "(SELECT COALESCE(SUM(o.\"totalReal\"),0) FROM orders o WHERE o.\"customerId\"=c.id AND o.status='PICKED_UP')",
  },
  daysSinceLastOrder: {
    label: "Days Since Last Order",
    description: "Days since most recent picked up order",
    type: "number",
    operators: ["gt", "gte", "lt", "lte", "between"],
    sqlFragment: "EXTRACT(DAY FROM NOW() - (SELECT MAX(o.\"pickedUpAt\") FROM orders o WHERE o.\"customerId\"=c.id AND o.status='PICKED_UP'))",
  },
  hasOrderInLastDays: {
    label: "Has Order In Last N Days",
    description: "Customer placed an order within the last N days",
    type: "number",
    operators: ["lt", "gt"],
    sqlFragment: "(SELECT COUNT(*) FROM orders o WHERE o.\"customerId\"=c.id AND o.status NOT IN ('DRAFT','CANCELLED') AND o.\"createdAt\" >= NOW() - INTERVAL '1 day' * $value)",
  },
  orderFrameBrand: {
    label: "Last Frame Brand",
    description: "Brand of frame from most recent order",
    type: "string",
    operators: ["eq", "contains"],
    sqlFragment: "(SELECT o.\"frameBrand\" FROM orders o WHERE o.\"customerId\"=c.id AND o.status='PICKED_UP' ORDER BY o.\"pickedUpAt\" DESC LIMIT 1)",
  },

  // ── Exams ─────────────────────────────────────────────────
  daysSinceLastExam: {
    label: "Days Since Last Exam",
    description: "Days since most recent eye exam",
    type: "number",
    operators: ["gt", "gte", "lt", "lte", "between"],
    sqlFragment: "EXTRACT(DAY FROM NOW() - (SELECT MAX(e.\"examDate\") FROM exams e WHERE e.\"customerId\"=c.id))",
  },
  hasExam: {
    label: "Has Exam on Record",
    description: "Customer has at least one exam recorded",
    type: "boolean",
    operators: ["eq"],
    sqlFragment: "(SELECT COUNT(*) FROM exams e WHERE e.\"customerId\"=c.id) > 0",
  },

  // ── Prescriptions ─────────────────────────────────────────
  rxExpiresInDays: {
    label: "Rx Expires In Days",
    description: "Days until current prescription expires",
    type: "number",
    operators: ["lt", "lte", "gt", "gte", "between"],
    sqlFragment: "EXTRACT(DAY FROM (SELECT MAX(p.expiry_date) FROM prescriptions p WHERE p.\"customerId\"=c.id AND p.\"isActive\"=true) - NOW())",
  },
  rxType: {
    label: "Rx Type",
    description: "Type of most recent active prescription",
    type: "enum",
    operators: ["eq"],
    sqlFragment: "(SELECT p.type FROM prescriptions p WHERE p.\"customerId\"=c.id AND p.\"isActive\"=true ORDER BY p.date DESC LIMIT 1)",
  },

  // ── Family ────────────────────────────────────────────────
  hasFamilyMembers: {
    label: "Has Family Members",
    description: "Customer belongs to a family group",
    type: "boolean",
    operators: ["eq"],
    sqlFragment: "(SELECT COUNT(*) FROM customers fc WHERE fc.\"familyId\"=c.\"familyId\" AND fc.id != c.id AND c.\"familyId\" IS NOT NULL) > 0",
  },

  // ── Insurance ─────────────────────────────────────────────
  insuranceRenewalMonth: {
    label: "Insurance Renewal Month",
    description: "Month when insurance renews (1-12)",
    type: "number",
    operators: ["eq", "in"],
    sqlFragment: "(SELECT MAX(ip.\"renewalMonth\") FROM insurance_policies ip WHERE ip.\"customerId\"=c.id AND ip.\"isActive\"=true)",
  },
  hasActiveInsurance: {
    label: "Has Active Insurance",
    description: "Customer has an active insurance policy",
    type: "boolean",
    operators: ["eq"],
    sqlFragment: "(SELECT COUNT(*) FROM insurance_policies ip WHERE ip.\"customerId\"=c.id AND ip.\"isActive\"=true) > 0",
  },

  // ── Walk-ins ──────────────────────────────────────────────
  hasWalkinQuoteNoOrder: {
    label: "Quote Given, No Order",
    description: "Walk-in with QUOTE_GIVEN outcome but no subsequent order",
    type: "boolean",
    operators: ["eq"],
    sqlFragment: "(SELECT COUNT(*) FROM walkins w WHERE w.\"customerId\"=c.id AND w.outcome='QUOTE_GIVEN' AND w.\"visitedAt\" >= NOW() - INTERVAL '90 days') > 0 AND (SELECT COUNT(*) FROM orders o WHERE o.\"customerId\"=c.id AND o.\"createdAt\" >= NOW() - INTERVAL '90 days') = 0",
  },
  daysSinceWalkin: {
    label: "Days Since Last Walk-in",
    description: "Days since last walk-in visit",
    type: "number",
    operators: ["gt", "gte", "lt", "lte", "between"],
    sqlFragment: "EXTRACT(DAY FROM NOW() - (SELECT MAX(w.\"visitedAt\") FROM walkins w WHERE w.\"customerId\"=c.id))",
  },

  // ── Medical/Lifestyle ─────────────────────────────────────
  primaryUse: {
    label: "Primary Use (Medical History)",
    description: "Primary use case from medical history (computer, driving, sports, etc.)",
    type: "string",
    operators: ["eq", "contains"],
    sqlFragment: "(SELECT mh.primary_use FROM medical_histories mh WHERE mh.customer_id=c.id LIMIT 1)",
  },
  wearsContacts: {
    label: "Wears Contact Lenses",
    description: "Customer is a contact lens wearer",
    type: "boolean",
    operators: ["eq"],
    sqlFragment: "(SELECT COALESCE(mh.wears_contacts, false) FROM medical_histories mh WHERE mh.customer_id=c.id LIMIT 1)",
  },
};

export function getFieldDefinition(field: string): FieldDefinition | null {
  return SEGMENT_FIELDS[field] ?? null;
}
