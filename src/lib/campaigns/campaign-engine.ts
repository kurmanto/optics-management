import { prisma } from "@/lib/prisma";
import { CampaignStatus } from "@prisma/client";
import { executeSegment } from "./segment-engine";
import { resolveVariables, interpolateTemplate } from "./template-engine";
import { getDripConfig } from "./drip-presets";
import { dispatchMessage } from "./dispatch";
import { canContact } from "./opt-out";
import { SegmentDefinition } from "./segment-types";
import { createNotification } from "@/lib/notifications";

interface ProcessResult {
  campaignId: string;
  campaignName: string;
  recipientsEnrolled: number;
  messagesQueued: number;
  messagesSent: number;
  messagesFailed: number;
  error?: string;
}

/**
 * Process all ACTIVE campaigns.
 */
export async function processAllCampaigns(): Promise<ProcessResult[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { status: CampaignStatus.ACTIVE },
  });

  const results: ProcessResult[] = [];
  for (const campaign of campaigns) {
    try {
      const result = await processCampaign(campaign.id);
      results.push(result);
      await createNotification({
        type: "CAMPAIGN_COMPLETED",
        title: "Campaign Run Complete",
        body: `${campaign.name}: ${result.messagesSent} sent, ${result.messagesFailed} failed.`,
        refId: campaign.id,
        refType: "Campaign",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        recipientsEnrolled: 0,
        messagesQueued: 0,
        messagesSent: 0,
        messagesFailed: 0,
        error: errorMsg,
      });
      await createNotification({
        type: "CAMPAIGN_ERROR",
        title: "Campaign Run Failed",
        body: `${campaign.name} encountered an error: ${errorMsg}`,
        refId: campaign.id,
        refType: "Campaign",
      });
    }
  }

  return results;
}

/**
 * Process a single campaign: enroll new recipients, advance drip steps.
 */
export async function processCampaign(campaignId: string): Promise<ProcessResult> {
  const startTime = Date.now();

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { recipients: true },
  });

  const segmentDef = (campaign.segmentConfig as SegmentDefinition | null) ?? null;
  const dripConfig = getDripConfig(campaign.type);

  // Create a run record
  const run = await prisma.campaignRun.create({
    data: { campaignId },
  });

  let recipientsEnrolled = 0;
  let messagesQueued = 0;
  let messagesSent = 0;
  let messagesFailed = 0;
  let runError: string | undefined;

  try {
    // --- Step 1: Enroll new recipients ---
    if (segmentDef) {
      const customerIds = await executeSegment(segmentDef);
      const existingIds = new Set(campaign.recipients.map((r) => r.customerId));

      const toEnroll = customerIds.filter((id) => !existingIds.has(id));

      if (toEnroll.length > 0) {
        await prisma.campaignRecipient.createMany({
          data: toEnroll.map((customerId) => ({
            campaignId,
            customerId,
            status: "ACTIVE",
            currentStep: 0,
          })),
          skipDuplicates: true,
        });
        recipientsEnrolled = toEnroll.length;
      }
    }

    // --- Step 2: Process drip steps for active recipients ---
    const activeRecipients = await prisma.campaignRecipient.findMany({
      where: { campaignId, status: "ACTIVE" },
      include: { customer: true },
    });

    for (const recipient of activeRecipients) {
      const step = dripConfig.steps[recipient.currentStep];
      if (!step) continue;

      // Check delay: has enough time passed since enrollment (or last message)?
      const referenceDate = recipient.lastMessageAt ?? recipient.enrolledAt;
      const daysSinceRef = Math.floor(
        (Date.now() - new Date(referenceDate).getTime()) / 86400000
      );

      if (daysSinceRef < step.delayDays) continue;

      // Check if customer can be contacted
      if (!canContact(recipient.customer, step.channel)) continue;

      // Resolve template variables
      const variables = await resolveVariables(recipient.customerId);
      const body = interpolateTemplate(step.templateBody, variables);
      const subject = step.templateSubject
        ? interpolateTemplate(step.templateSubject, variables)
        : undefined;

      const to =
        step.channel === "SMS"
          ? (recipient.customer.phone ?? "")
          : (recipient.customer.email ?? "");

      if (!to) continue;

      messagesQueued++;

      try {
        await dispatchMessage({
          campaignId,
          customerId: recipient.customerId,
          channel: step.channel,
          subject,
          body,
          to,
          stepIndex: step.stepIndex,
          runId: run.id,
        });
        messagesSent++;

        // Advance to next step or complete
        const nextStep = recipient.currentStep + 1;
        const isComplete = nextStep >= dripConfig.steps.length;

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            currentStep: nextStep,
            lastMessageAt: new Date(),
            status: isComplete ? "COMPLETED" : "ACTIVE",
            completedAt: isComplete ? new Date() : null,
          },
        });
      } catch {
        messagesFailed++;
      }
    }

    // --- Step 3: Check conversions ---
    await checkConversions(campaignId);

    // --- Step 4: Update run record ---
    const durationMs = Date.now() - startTime;
    const recipientsFound = await prisma.campaignRecipient.count({ where: { campaignId } });

    await prisma.campaignRun.update({
      where: { id: run.id },
      data: {
        recipientsFound,
        messagesQueued,
        messagesSent,
        messagesFailed,
        durationMs,
      },
    });

    // --- Step 5: Update campaign aggregate stats ---
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        lastRunAt: new Date(),
        totalSent: { increment: messagesSent },
        totalDelivered: { increment: messagesSent }, // approximation for console placeholder
      },
    });
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err);
    await prisma.campaignRun.update({
      where: { id: run.id },
      data: { error: runError },
    });
    throw err;
  }

  return {
    campaignId,
    campaignName: campaign.name,
    recipientsEnrolled,
    messagesQueued,
    messagesSent,
    messagesFailed,
    error: runError,
  };
}

/**
 * Detect conversions: recipients who placed an order after enrollment.
 * Re-queries recipients fresh to include any newly enrolled in this run.
 */
async function checkConversions(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const dripConfig = getDripConfig(campaign.type);
  if (!dripConfig.stopOnConversion) return;

  const activeRecipients = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "ACTIVE" },
  });

  for (const recipient of activeRecipients) {
    const orderAfterEnrollment = await prisma.order.findFirst({
      where: {
        customerId: recipient.customerId,
        createdAt: { gte: recipient.enrolledAt },
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
    });

    if (orderAfterEnrollment) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "CONVERTED",
          convertedAt: new Date(),
          conversionValue: orderAfterEnrollment.totalReal,
        },
      });

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalConverted: { increment: 1 },
          totalRevenue: { increment: orderAfterEnrollment.totalReal },
        },
      });
    }
  }
}
