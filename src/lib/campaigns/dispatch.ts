import { prisma } from "@/lib/prisma";
import { MessageChannel } from "@prisma/client";

/**
 * Send an SMS message (placeholder — replace with Twilio in production).
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const externalId = `sms_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  console.log(`[SMS DISPATCH] To: ${to}`);
  console.log(`[SMS DISPATCH] Body: ${body}`);
  console.log(`[SMS DISPATCH] Mock ID: ${externalId}`);
  return externalId;
}

/**
 * Send an email message (placeholder — replace with Resend in production).
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<string> {
  const externalId = `email_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  console.log(`[EMAIL DISPATCH] To: ${to}`);
  console.log(`[EMAIL DISPATCH] Subject: ${subject}`);
  console.log(`[EMAIL DISPATCH] Body: ${body}`);
  console.log(`[EMAIL DISPATCH] Mock ID: ${externalId}`);
  return externalId;
}

export interface DispatchOptions {
  campaignId?: string;
  customerId: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
  to: string;
  stepIndex?: number;
  runId?: string;
}

/**
 * Create a Message record and dispatch via the appropriate channel.
 * Returns the message id.
 */
export async function dispatchMessage(opts: DispatchOptions): Promise<string> {
  const { campaignId, customerId, channel, subject, body, to, stepIndex, runId } = opts;

  const message = await prisma.message.create({
    data: {
      campaignId: campaignId ?? null,
      customerId,
      channel,
      subject: subject ?? null,
      body,
      stepIndex: stepIndex ?? null,
      runId: runId ?? null,
      status: "PENDING",
    },
  });

  try {
    let externalId: string;

    if (channel === "SMS") {
      externalId = await sendSms(to, body);
    } else {
      externalId = await sendEmail(to, subject ?? "(no subject)", body);
    }

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        externalId,
      },
    });
  } catch (err) {
    console.error("[dispatch] Failed to send message:", err);
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
  }

  return message.id;
}
