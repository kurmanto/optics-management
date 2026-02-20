export type SegmentOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "between"
  | "is_null"
  | "is_not_null";

export interface SegmentCondition {
  field: string;
  operator: SegmentOperator;
  value?: unknown;
  value2?: unknown; // for "between"
}

export interface SegmentDefinition {
  logic: "AND" | "OR";
  conditions: SegmentCondition[];
  excludeMarketingOptOut: boolean;
  excludeRecentlyContacted?: number; // days
  requireChannel?: "SMS" | "EMAIL";
}
