import { ClientNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendClientNotificationEmail } from "@/lib/email";

type CreateParams = {
  clientAccountId: string;
  type: ClientNotificationType;
  title: string;
  body: string;
  href?: string;
  refId?: string;
  refType?: string;
  sendEmail?: boolean;
};

/**
 * Create a client notification (fire-and-forget — never throws).
 * Checks notification preferences before creating.
 */
export async function createClientNotification(params: CreateParams): Promise<void> {
  try {
    // Check preferences
    const pref = await prisma.clientNotificationPreference.findUnique({
      where: {
        clientAccountId_type: {
          clientAccountId: params.clientAccountId,
          type: params.type,
        },
      },
    });

    // If preference exists and in-app is disabled, skip notification
    if (pref && !pref.inAppEnabled) return;

    const notification = await prisma.clientNotification.create({
      data: {
        clientAccountId: params.clientAccountId,
        type: params.type,
        title: params.title,
        body: params.body,
        href: params.href ?? null,
        refId: params.refId ?? null,
        refType: params.refType ?? null,
      },
    });

    // Send email if requested and preference allows
    const shouldEmail = params.sendEmail !== false && (!pref || pref.emailEnabled);
    if (shouldEmail) {
      const account = await prisma.clientAccount.findUnique({
        where: { id: params.clientAccountId },
        select: { email: true, primaryCustomer: { select: { firstName: true } } },
      });

      if (account?.email) {
        await sendClientNotificationEmail({
          to: account.email,
          name: account.primaryCustomer.firstName,
          title: params.title,
          body: params.body,
          href: params.href,
        });

        await prisma.clientNotification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
      }
    }
  } catch (err) {
    // Fire-and-forget — never crash the caller
    console.error("[createClientNotification]", err);
  }
}

/**
 * Create a client notification for a family (looks up ClientAccount).
 * Fire-and-forget — never throws.
 */
export async function createClientNotificationForFamily(params: {
  familyId: string;
  type: ClientNotificationType;
  title: string;
  body: string;
  href?: string;
  refId?: string;
  refType?: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    const account = await prisma.clientAccount.findFirst({
      where: { familyId: params.familyId, isActive: true },
      select: { id: true },
    });

    if (!account) return;

    await createClientNotification({
      ...params,
      clientAccountId: account.id,
    });
  } catch (err) {
    console.error("[createClientNotificationForFamily]", err);
  }
}
