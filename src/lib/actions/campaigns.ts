"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { CampaignStatus, CampaignType, MessageChannel, Prisma } from "@prisma/client";
import {
  CreateCampaignSchema,
  UpdateCampaignSchema,
  CreateMessageTemplateSchema,
  UpdateMessageTemplateSchema,
} from "@/lib/validations/campaign";
import { previewSegmentCount, previewSegmentSample } from "@/lib/campaigns/segment-engine";
import { processCampaign } from "@/lib/campaigns/campaign-engine";
import { SegmentDefinition } from "@/lib/campaigns/segment-types";

// ─────────────────────────────────────────
// CAMPAIGN CRUD
// ─────────────────────────────────────────

export async function createCampaign(
  input: unknown
): Promise<{ id: string } | { error: string }> {
  const session = await verifySession();

  const parsed = CreateCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, type, description, segmentConfig, scheduleConfig, templateId, config } =
    parsed.data;

  try {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        type: type as CampaignType,
        description: description ?? null,
        segmentConfig: segmentConfig ? (segmentConfig as Prisma.InputJsonValue) : undefined,
        scheduleConfig: scheduleConfig ? (scheduleConfig as Prisma.InputJsonValue) : undefined,
        templateId: templateId ?? null,
        config: config ? (config as Prisma.InputJsonValue) : {},
        createdById: session.id,
        status: CampaignStatus.DRAFT,
      },
    });

    revalidatePath("/campaigns");
    return { id: campaign.id };
  } catch (err) {
    console.error("[createCampaign]", err);
    return { error: "Failed to create campaign" };
  }
}

export async function updateCampaign(
  id: string,
  input: unknown
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  const parsed = UpdateCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, type, description, segmentConfig, scheduleConfig, templateId, config } =
    parsed.data;

  try {
    await prisma.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type: type as CampaignType }),
        ...(description !== undefined && { description }),
        ...(segmentConfig !== undefined && {
          segmentConfig: segmentConfig as Prisma.InputJsonValue,
        }),
        ...(scheduleConfig !== undefined && {
          scheduleConfig: scheduleConfig as Prisma.InputJsonValue,
        }),
        ...(templateId !== undefined && { templateId }),
        ...(config !== undefined && { config: config as Prisma.InputJsonValue }),
      },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[updateCampaign]", err);
    return { error: "Failed to update campaign" };
  }
}

export async function deleteCampaign(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  try {
    await prisma.campaign.delete({ where: { id } });
    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error("[deleteCampaign]", err);
    return { error: "Failed to delete campaign" };
  }
}

// ─────────────────────────────────────────
// STATUS TRANSITIONS
// ─────────────────────────────────────────

export async function activateCampaign(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  try {
    await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.ACTIVE,
        nextRunAt: new Date(),
      },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[activateCampaign]", err);
    return { error: "Failed to activate campaign" };
  }
}

export async function pauseCampaign(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  try {
    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[pauseCampaign]", err);
    return { error: "Failed to pause campaign" };
  }
}

export async function archiveCampaign(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  try {
    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ARCHIVED },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[archiveCampaign]", err);
    return { error: "Failed to archive campaign" };
  }
}

// ─────────────────────────────────────────
// SEGMENT PREVIEW
// ─────────────────────────────────────────

export async function previewSegment(segmentConfig: SegmentDefinition): Promise<
  | { count: number; sample: { id: string; firstName: string; lastName: string; phone: string | null; email: string | null }[] }
  | { error: string }
> {
  await verifySession();

  try {
    const [count, sample] = await Promise.all([
      previewSegmentCount(segmentConfig),
      previewSegmentSample(segmentConfig),
    ]);
    return { count, sample };
  } catch (err) {
    console.error("[previewSegment]", err);
    return { error: "Failed to preview segment" };
  }
}

// ─────────────────────────────────────────
// RECIPIENTS
// ─────────────────────────────────────────

export async function enrollCustomer(
  campaignId: string,
  customerId: string
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  try {
    await prisma.campaignRecipient.upsert({
      where: { campaignId_customerId: { campaignId, customerId } },
      create: { campaignId, customerId, status: "ACTIVE", currentStep: 0 },
      update: { status: "ACTIVE" },
    });

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    console.error("[enrollCustomer]", err);
    return { error: "Failed to enroll customer" };
  }
}

export async function removeRecipient(
  recipientId: string
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  try {
    const recipient = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipientId },
    });

    await prisma.campaignRecipient.delete({ where: { id: recipientId } });
    revalidatePath(`/campaigns/${recipient.campaignId}`);
    return { success: true };
  } catch (err) {
    console.error("[removeRecipient]", err);
    return { error: "Failed to remove recipient" };
  }
}

// ─────────────────────────────────────────
// MANUAL TRIGGER
// ─────────────────────────────────────────

export async function triggerCampaignRun(
  campaignId: string
): Promise<{ success: boolean; result?: object } | { error: string }> {
  const session = await verifySession();

  if (session.role !== "ADMIN") {
    return { error: "Admin only" };
  }

  try {
    const result = await processCampaign(campaignId);
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, result };
  } catch (err) {
    console.error("[triggerCampaignRun]", err);
    return { error: err instanceof Error ? err.message : "Failed to process campaign" };
  }
}

// ─────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────

export async function getCampaignAnalytics(campaignId: string) {
  await verifySession();

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      _count: { select: { recipients: true, messages: true } },
      runs: { orderBy: { runAt: "desc" }, take: 10 },
    },
  });

  const recipientsByStatus = await prisma.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  });

  const messagesByStatus = await prisma.message.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  });

  return {
    campaign,
    recipientsByStatus,
    messagesByStatus,
  };
}

// ─────────────────────────────────────────
// MESSAGE TEMPLATES
// ─────────────────────────────────────────

export async function createMessageTemplate(
  input: unknown
): Promise<{ id: string } | { error: string }> {
  await verifySession();

  const parsed = CreateMessageTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, channel, campaignType, subject, body, isDefault } = parsed.data;

  try {
    const template = await prisma.messageTemplate.create({
      data: {
        name,
        channel: channel as MessageChannel,
        campaignType: campaignType ? (campaignType as CampaignType) : null,
        subject: subject ?? null,
        body,
        isDefault: isDefault ?? false,
      },
    });

    revalidatePath("/campaigns");
    return { id: template.id };
  } catch (err) {
    console.error("[createMessageTemplate]", err);
    return { error: "Failed to create template" };
  }
}

export async function updateMessageTemplate(
  id: string,
  input: unknown
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  const parsed = UpdateMessageTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.channel !== undefined && { channel: parsed.data.channel as MessageChannel }),
        ...(parsed.data.campaignType !== undefined && {
          campaignType: parsed.data.campaignType ? (parsed.data.campaignType as CampaignType) : null,
        }),
        ...(parsed.data.subject !== undefined && { subject: parsed.data.subject }),
        ...(parsed.data.body !== undefined && { body: parsed.data.body }),
        ...(parsed.data.isDefault !== undefined && { isDefault: parsed.data.isDefault }),
      },
    });

    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error("[updateMessageTemplate]", err);
    return { error: "Failed to update template" };
  }
}

export async function deleteMessageTemplate(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  await verifySession();

  try {
    await prisma.messageTemplate.delete({ where: { id } });
    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error("[deleteMessageTemplate]", err);
    return { error: "Failed to delete template" };
  }
}
