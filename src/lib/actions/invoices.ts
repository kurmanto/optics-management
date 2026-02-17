"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { InvoiceType } from "@prisma/client";

export async function issueInvoice(
  orderId: string
): Promise<{ id: string; generatedAt: Date } | { error: string }> {
  await verifySession();

  try {
    // Upsert — one CUSTOMER invoice per order
    const existing = await prisma.invoice.findFirst({
      where: { orderId, type: InvoiceType.CUSTOMER },
    });

    if (existing) {
      // Re-issue: update the timestamp
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
        type: InvoiceType.CUSTOMER,
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
