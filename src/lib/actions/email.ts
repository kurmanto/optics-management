"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sendInvoiceEmail } from "@/lib/email";

export async function emailInvoice(
  orderId: string,
  mode: "customer" | "internal" = "customer"
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        lineItems: {
          select: {
            description: true,
            quantity: true,
            unitPriceCustomer: true,
            unitPriceReal: true,
            totalCustomer: true,
            totalReal: true,
          },
        },
      },
    });

    if (!order) return { error: "Order not found" };

    const customerEmail = order.customer.email;
    if (!customerEmail) return { error: "Customer has no email address on file" };

    const isInternal = mode === "internal";
    const total = isInternal ? order.totalReal : order.totalCustomer;
    const deposit = isInternal ? order.depositReal : order.depositCustomer;
    const balance = isInternal ? order.balanceReal : order.balanceCustomer;

    const result = await sendInvoiceEmail({
      to: customerEmail,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      orderNumber: order.orderNumber,
      totalAmount: total,
      lineItems: order.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPriceCustomer: isInternal ? li.unitPriceReal : li.unitPriceCustomer,
        totalCustomer: isInternal ? li.totalReal : li.totalCustomer,
      })),
      depositAmount: deposit > 0 ? deposit : undefined,
      balanceAmount: balance > 0 ? balance : undefined,
      insuranceCoverage: order.insuranceCoverage ?? undefined,
      referralCredit: order.referralCredit ?? undefined,
    });

    if (result.error) {
      return { error: String(result.error) };
    }

    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to send email" };
  }
}
