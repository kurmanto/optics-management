"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { InvoiceType } from "@prisma/client";

export async function issueInvoice(
  orderId: string,
  type: InvoiceType = InvoiceType.CUSTOMER
): Promise<{ id: string; generatedAt: Date } | { error: string }> {
  await verifySession();

  try {
    const existing = await prisma.invoice.findFirst({
      where: { orderId, type },
    });

    if (existing) {
      const updated = await prisma.invoice.update({
        where: { id: existing.id },
        data: { generatedAt: new Date() },
        select: { id: true, generatedAt: true },
      });
      revalidatePath(`/orders/${orderId}/invoice`);
      revalidatePath("/invoices");
      return updated;
    }

    const invoice = await prisma.invoice.create({
      data: {
        orderId,
        type,
        generatedAt: new Date(),
      },
      select: { id: true, generatedAt: true },
    });

    revalidatePath(`/orders/${orderId}/invoice`);
    revalidatePath("/invoices");
    return invoice;
  } catch (err) {
    console.error("issueInvoice error:", err);
    return { error: "Failed to record invoice." };
  }
}

export async function issueBothInvoices(
  orderId: string
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  try {
    await Promise.all([
      issueInvoice(orderId, InvoiceType.CUSTOMER),
      issueInvoice(orderId, InvoiceType.INTERNAL),
    ]);
    return { success: true };
  } catch (err) {
    console.error("issueBothInvoices error:", err);
    return { error: "Failed to issue both invoices." };
  }
}
