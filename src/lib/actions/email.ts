"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sendInvoiceEmail } from "@/lib/email";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

function invoiceNumber(orderNumber: string): string {
  const parts = orderNumber.split("-");
  const last = parts[parts.length - 1];
  return last.padStart(4, "0");
}

export async function emailInvoice(
  orderId: string,
  mode: "customer" | "internal" = "customer"
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            address: true,
            city: true,
            province: true,
            postalCode: true,
          },
        },
        user: { select: { name: true } },
        lineItems: {
          select: {
            description: true,
            quantity: true,
            unitPriceCustomer: true,
            unitPriceReal: true,
            totalCustomer: true,
            totalReal: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) return { error: "Order not found" };

    const customerEmail = order.customer.email;
    if (!customerEmail) return { error: "Customer has no email address on file" };

    const isInternal = mode === "internal";
    const invNum = invoiceNumber(order.orderNumber);

    const lineItems = order.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      total: isInternal ? li.totalReal : li.totalCustomer,
    }));

    const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
    const insurance = order.insuranceCoverage ?? 0;
    const referral = order.referralCredit ?? 0;
    const deposit = isInternal ? order.depositReal : order.depositCustomer;
    const total = subtotal - insurance - referral - deposit;

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf({
      orderNumber: order.orderNumber,
      invoiceNumber: invNum,
      date: new Date(order.createdAt).toLocaleDateString("en-CA"),
      mode,
      customer: order.customer,
      staffName: order.user.name,
      lineItems,
      subtotal,
      insuranceCoverage: insurance,
      referralCredit: referral,
      deposit,
      total,
      notes: order.notes,
    });

    // Send email with PDF attachment
    const result = await sendInvoiceEmail({
      to: customerEmail,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      orderNumber: order.orderNumber,
      pdfBuffer,
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
