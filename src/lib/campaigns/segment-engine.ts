import { prisma } from "@/lib/prisma";
import { SegmentDefinition, SegmentCondition, SegmentOperator } from "./segment-types";

/**
 * Build a SQL WHERE clause fragment from a segment condition.
 * Returns a parameterized fragment and any values needed.
 */
function buildConditionSQL(condition: SegmentCondition, paramOffset: number): { sql: string; values: unknown[] } {
  const { field, operator, value, value2 } = condition;

  // Map abstract field names to SQL expressions
  const fieldMap: Record<string, string> = {
    age: "EXTRACT(YEAR FROM AGE(NOW(), c.\"dateOfBirth\"))",
    birthdayMonth: "EXTRACT(MONTH FROM c.\"dateOfBirth\")",
    gender: "c.gender::text",
    city: "c.city",
    tags: "c.tags",
    isOnboarded: "c.\"isOnboarded\"",
    lifetimeOrderCount: "(SELECT COUNT(*)::int FROM orders o WHERE o.\"customerId\"=c.id AND o.status='PICKED_UP')",
    lifetimeSpend: "(SELECT COALESCE(SUM(o.\"totalReal\"),0) FROM orders o WHERE o.\"customerId\"=c.id AND o.status='PICKED_UP')",
    daysSinceLastOrder: "EXTRACT(DAY FROM NOW() - (SELECT MAX(o.\"pickedUpAt\") FROM orders o WHERE o.\"customerId\"=c.id AND o.status='PICKED_UP'))",
    daysSinceLastExam: "EXTRACT(DAY FROM NOW() - (SELECT MAX(e.\"examDate\") FROM exams e WHERE e.\"customerId\"=c.id))",
    hasExam: "(SELECT COUNT(*)::int FROM exams e WHERE e.\"customerId\"=c.id) > 0",
    rxExpiresInDays: "EXTRACT(DAY FROM (SELECT MAX(p.expiry_date) FROM prescriptions p WHERE p.\"customerId\"=c.id AND p.\"isActive\"=true) - NOW())",
    rxType: "(SELECT p.type::text FROM prescriptions p WHERE p.\"customerId\"=c.id AND p.\"isActive\"=true ORDER BY p.date DESC LIMIT 1)",
    hasFamilyMembers: "(SELECT COUNT(*)::int FROM customers fc WHERE fc.\"familyId\"=c.\"familyId\" AND fc.id != c.id AND c.\"familyId\" IS NOT NULL) > 0",
    insuranceRenewalMonth: "(SELECT MAX(ip.\"renewalMonth\")::int FROM insurance_policies ip WHERE ip.\"customerId\"=c.id AND ip.\"isActive\"=true)",
    hasActiveInsurance: "(SELECT COUNT(*)::int FROM insurance_policies ip WHERE ip.\"customerId\"=c.id AND ip.\"isActive\"=true) > 0",
    hasWalkinQuoteNoOrder: "(SELECT COUNT(*)::int FROM walkins w WHERE w.\"customerId\"=c.id AND w.outcome='QUOTE_GIVEN' AND w.\"visitedAt\" >= NOW() - INTERVAL '90 days') > 0 AND (SELECT COUNT(*)::int FROM orders o WHERE o.\"customerId\"=c.id AND o.\"createdAt\" >= NOW() - INTERVAL '90 days') = 0",
    daysSinceWalkin: "EXTRACT(DAY FROM NOW() - (SELECT MAX(w.\"visitedAt\") FROM walkins w WHERE w.\"customerId\"=c.id))",
    primaryUse: "(SELECT mh.primary_use FROM medical_histories mh WHERE mh.customer_id=c.id LIMIT 1)",
    wearsContacts: "(SELECT COALESCE(mh.wears_contacts, false) FROM medical_histories mh WHERE mh.customer_id=c.id LIMIT 1)",
  };

  const fieldSQL = fieldMap[field];
  if (!fieldSQL) {
    return { sql: "1=1", values: [] };
  }

  // For boolean-expression fields (already contain comparison)
  const booleanFields = ["hasExam", "hasFamilyMembers", "hasActiveInsurance", "hasWalkinQuoteNoOrder"];
  if (booleanFields.includes(field)) {
    if (operator === "eq" && value === true) return { sql: `(${fieldSQL})`, values: [] };
    if (operator === "eq" && value === false) return { sql: `NOT (${fieldSQL})`, values: [] };
    return { sql: "1=1", values: [] };
  }

  const p1 = `$${paramOffset}`;
  const p2 = `$${paramOffset + 1}`;

  const opMap: Partial<Record<SegmentOperator, string>> = {
    eq: "=",
    neq: "!=",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
  };

  switch (operator) {
    case "eq":
    case "neq":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return { sql: `(${fieldSQL}) ${opMap[operator]} ${p1}`, values: [value] };
    case "between":
      return { sql: `(${fieldSQL}) BETWEEN ${p1} AND ${p2}`, values: [value, value2] };
    case "in":
      return { sql: `(${fieldSQL}) = ANY(${p1})`, values: [value] };
    case "not_in":
      return { sql: `NOT ((${fieldSQL}) = ANY(${p1}))`, values: [value] };
    case "contains":
      return { sql: `(${fieldSQL}) ILIKE ${p1}`, values: [`%${value}%`] };
    case "is_null":
      return { sql: `(${fieldSQL}) IS NULL`, values: [] };
    case "is_not_null":
      return { sql: `(${fieldSQL}) IS NOT NULL`, values: [] };
    default:
      return { sql: "1=1", values: [] };
  }
}

function buildSegmentSQL(segment: SegmentDefinition): { sql: string; values: unknown[] } {
  const allValues: unknown[] = [];
  const clauses: string[] = [];
  let paramOffset = 1;

  // Base: active, non-opted-out customers
  const whereClauses: string[] = ["c.\"isActive\" = true"];

  if (segment.excludeMarketingOptOut) {
    whereClauses.push("c.\"marketing_opt_out\" = false");
  }

  if (segment.requireChannel === "SMS") {
    whereClauses.push("c.\"smsOptIn\" = true");
    whereClauses.push("c.phone IS NOT NULL");
  } else if (segment.requireChannel === "EMAIL") {
    whereClauses.push("c.\"emailOptIn\" = true");
    whereClauses.push("c.email IS NOT NULL");
  }

  if (segment.excludeRecentlyContacted) {
    const p = `$${paramOffset}`;
    whereClauses.push(
      `c.id NOT IN (SELECT m."customerId" FROM messages m WHERE m."createdAt" >= NOW() - INTERVAL '1 day' * ${p})`
    );
    allValues.push(segment.excludeRecentlyContacted);
    paramOffset += 1;
  }

  // Build condition clauses
  for (const condition of segment.conditions) {
    const { sql, values } = buildConditionSQL(condition, paramOffset);
    clauses.push(sql);
    allValues.push(...values);
    paramOffset += values.length;
  }

  if (clauses.length > 0) {
    const joined =
      segment.logic === "AND"
        ? clauses.join(" AND ")
        : clauses.join(" OR ");
    whereClauses.push(`(${joined})`);
  }

  const where = whereClauses.join(" AND ");
  const sql = `SELECT c.id FROM customers c WHERE ${where}`;

  return { sql, values: allValues };
}

export async function executeSegment(segment: SegmentDefinition): Promise<string[]> {
  const { sql, values } = buildSegmentSQL(segment);

  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(sql, ...values);
    return rows.map((r) => r.id);
  } catch (err) {
    console.error("[segment-engine] executeSegment error:", err);
    return [];
  }
}

export async function previewSegmentCount(segment: SegmentDefinition): Promise<number> {
  const { sql, values } = buildSegmentSQL(segment);
  const countSql = `SELECT COUNT(*)::int as count FROM (${sql}) sub`;

  try {
    const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(countSql, ...values);
    return Number(rows[0]?.count ?? 0);
  } catch (err) {
    console.error("[segment-engine] previewSegmentCount error:", err);
    return 0;
  }
}

export async function previewSegmentSample(
  segment: SegmentDefinition
): Promise<{ id: string; firstName: string; lastName: string; phone: string | null; email: string | null }[]> {
  const { sql, values } = buildSegmentSQL(segment);
  const sampleSql = `
    SELECT c.id, c."firstName", c."lastName", c.phone, c.email
    FROM customers c
    WHERE c.id IN (${sql})
    LIMIT 10
  `;

  try {
    const rows = await prisma.$queryRawUnsafe<{
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      email: string | null;
    }[]>(sampleSql, ...values);
    return rows;
  } catch (err) {
    console.error("[segment-engine] previewSegmentSample error:", err);
    return [];
  }
}
