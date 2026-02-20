import { z } from "zod";

export const SegmentConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "not_in", "contains", "between", "is_null", "is_not_null",
  ]),
  value: z.unknown().optional(),
  value2: z.unknown().optional(),
});

export const SegmentDefinitionSchema = z.object({
  logic: z.enum(["AND", "OR"]),
  conditions: z.array(SegmentConditionSchema),
  excludeMarketingOptOut: z.boolean(),
  excludeRecentlyContacted: z.number().optional(),
  requireChannel: z.enum(["SMS", "EMAIL"]).optional(),
});

export const DripStepSchema = z.object({
  stepIndex: z.number().int().min(0),
  delayDays: z.number().int().min(0),
  channel: z.enum(["SMS", "EMAIL"]),
  templateBody: z.string().min(1),
  templateSubject: z.string().optional(),
});

export const ScheduleConfigSchema = z.object({
  frequency: z.enum(["once", "daily", "weekly", "monthly"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeOfDay: z.string().optional(),
});

export const CampaignConfigSchema = z.object({
  steps: z.array(DripStepSchema),
  stopOnConversion: z.boolean(),
  cooldownDays: z.number().int().min(0),
  enrollmentMode: z.enum(["auto", "manual"]),
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  description: z.string().optional(),
  segmentConfig: SegmentDefinitionSchema.optional(),
  scheduleConfig: ScheduleConfigSchema.optional(),
  templateId: z.string().optional(),
  config: CampaignConfigSchema.optional(),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial();

export const CreateMessageTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  channel: z.enum(["SMS", "EMAIL"]),
  campaignType: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export const UpdateMessageTemplateSchema = CreateMessageTemplateSchema.partial();
