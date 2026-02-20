import { prisma } from "@/lib/prisma";
import { Customer } from "@prisma/client";

/**
 * Check whether a customer can be contacted via the given channel.
 */
export function canContact(
  customer: Pick<Customer, "marketingOptOut" | "smsOptIn" | "emailOptIn" | "phone" | "email">,
  channel: "SMS" | "EMAIL"
): boolean {
  if (customer.marketingOptOut) return false;

  if (channel === "SMS") {
    return customer.smsOptIn === true && !!customer.phone;
  }

  if (channel === "EMAIL") {
    return customer.emailOptIn === true && !!customer.email;
  }

  return false;
}

/**
 * Mark a customer as opted out from all marketing.
 */
export async function processOptOut(
  customerId: string,
  source: string,
  reason?: string
): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      marketingOptOut: true,
      optOutReason: reason ?? source,
      optOutDate: new Date(),
      optOutBy: source,
    },
  });

  // Also complete any active campaign enrollments
  await prisma.campaignRecipient.updateMany({
    where: { customerId, status: "ACTIVE" },
    data: {
      status: "OPTED_OUT",
      optedOutAt: new Date(),
    },
  });
}
