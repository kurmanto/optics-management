"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notifications";

export type POFormState = { error?: string };

// ─── Private helpers ─────────────────────────────────────────────────────────

async function generatePONumber(): Promise<string> {
  const count = await prisma.purchaseOrder.count();
  const seq = String(count + 1).padStart(3, "0");
  return `PO-2026-${seq}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreatePOInput = {
  vendorId: string;
  expectedAt?: string;
  shipping: number;
  duties: number;
  notes?: string;
  lineItems: Array<{
    inventoryItemId: string;
    quantityOrdered: number;
    unitCost: number;
  }>;
};

export type LineItemReceivable = {
  lineItemId: string;
  quantityReceived: number;
  conditionNotes?: string;
};

// ─── Create Purchase Order ────────────────────────────────────────────────────

export async function createPurchaseOrder(
  input: CreatePOInput
): Promise<POFormState> {
  const session = await verifySession();

  if (!input.vendorId) {
    return { error: "Vendor is required." };
  }
  if (!input.lineItems || input.lineItems.length === 0) {
    return { error: "At least one line item is required." };
  }

  const subtotal = input.lineItems.reduce(
    (sum, li) => sum + li.quantityOrdered * li.unitCost,
    0
  );
  const shipping = input.shipping ?? 0;
  const duties = input.duties ?? 0;
  const total = subtotal + shipping + duties;

  let newPoId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const poNumber = await generatePONumber();

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          vendorId: input.vendorId,
          status: "DRAFT",
          expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
          subtotal,
          shipping,
          duties,
          total,
          notes: input.notes ?? null,
          createdBy: session.id,
        },
      });

      newPoId = po.id;

      await tx.purchaseOrderLineItem.createMany({
        data: input.lineItems.map((li) => ({
          poId: po.id,
          inventoryItemId: li.inventoryItemId,
          quantityOrdered: li.quantityOrdered,
          quantityReceived: 0,
          unitCost: li.unitCost,
        })),
      });

      for (const li of input.lineItems) {
        await tx.inventoryItem.update({
          where: { id: li.inventoryItemId },
          data: { onOrderQty: { increment: li.quantityOrdered } },
        });
      }
    });

    revalidatePath("/inventory/purchase-orders");
    revalidatePath("/inventory");
    redirect(`/inventory/purchase-orders/${newPoId}`);
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: "Failed to create purchase order. Please try again." };
  }
}

export async function createPOAction(input: CreatePOInput): Promise<POFormState> {
  return createPurchaseOrder(input);
}

// ─── Update PO Status ─────────────────────────────────────────────────────────

export async function updatePOStatus(
  poId: string,
  status: "SENT" | "CONFIRMED" | "CANCELLED"
): Promise<POFormState> {
  await verifySession();

  try {
    await prisma.$transaction(async (tx) => {
      if (status === "CANCELLED") {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: poId },
          include: { lineItems: true },
        });
        if (!po) throw new Error("PO not found");
        if (po.status === "RECEIVED" || po.status === "CANCELLED") {
          throw new Error(
            "Cannot cancel a PO that is already received or cancelled."
          );
        }
        for (const li of po.lineItems) {
          const remaining = li.quantityOrdered - li.quantityReceived;
          if (remaining > 0) {
            await tx.inventoryItem.update({
              where: { id: li.inventoryItemId },
              data: { onOrderQty: { decrement: remaining } },
            });
          }
        }
      }
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status },
      });
    });

    revalidatePath(`/inventory/purchase-orders/${poId}`);
    revalidatePath("/inventory/purchase-orders");
    revalidatePath("/inventory");
    return {};
  } catch (e: any) {
    return { error: e?.message ?? "Failed to update status." };
  }
}

// ─── Receive PO Items ─────────────────────────────────────────────────────────

export async function receivePOItems(
  poId: string,
  lineItemReceivables: LineItemReceivable[]
): Promise<POFormState> {
  const session = await verifySession();

  try {
    await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { lineItems: { include: { inventoryItem: true } } },
      });

      if (!po) throw new Error("Purchase order not found.");
      if (po.status === "CANCELLED")
        throw new Error("Cannot receive items for a cancelled PO.");
      if (po.status === "RECEIVED")
        throw new Error("This PO has already been fully received.");

      const totalItemsOrdered = po.lineItems.reduce(
        (sum, li) => sum + li.quantityOrdered,
        0
      );
      const now = new Date();

      for (const receivable of lineItemReceivables) {
        if (!receivable.quantityReceived || receivable.quantityReceived <= 0)
          continue;

        const lineItem = po.lineItems.find(
          (li) => li.id === receivable.lineItemId
        );
        if (!lineItem) continue;

        const remaining = lineItem.quantityOrdered - lineItem.quantityReceived;
        const actualReceived = Math.min(receivable.quantityReceived, remaining);
        if (actualReceived <= 0) continue;

        const newQuantityReceived = lineItem.quantityReceived + actualReceived;

        await tx.purchaseOrderLineItem.update({
          where: { id: lineItem.id },
          data: {
            quantityReceived: newQuantityReceived,
            receivedAt: now,
            conditionNotes:
              receivable.conditionNotes ?? lineItem.conditionNotes,
          },
        });

        const currentItem = lineItem.inventoryItem;
        const newStock = currentItem.stockQuantity + actualReceived;
        const newOnOrder = Math.max(0, currentItem.onOrderQty - actualReceived);

        // Prorated landed cost per unit
        const proratedOverhead =
          totalItemsOrdered > 0
            ? ((po.shipping + po.duties) * lineItem.quantityOrdered) /
              totalItemsOrdered
            : 0;
        const landedCost =
          lineItem.unitCost +
          (lineItem.quantityOrdered > 0
            ? proratedOverhead / lineItem.quantityOrdered
            : 0);

        await tx.inventoryItem.update({
          where: { id: currentItem.id },
          data: {
            stockQuantity: newStock,
            onOrderQty: newOnOrder,
            landedCost,
            firstReceivedAt: currentItem.firstReceivedAt ?? now,
          },
        });

        await tx.inventoryLedger.create({
          data: {
            inventoryItemId: currentItem.id,
            reason: "PURCHASE_ORDER_RECEIVED",
            quantityChange: actualReceived,
            quantityAfter: newStock,
            unitCost: lineItem.unitCost,
            referenceId: poId,
            referenceType: "PO",
            notes: receivable.conditionNotes ?? null,
            createdBy: session.id,
          },
        });
      }

      // Determine new PO status
      const updatedLineItems = await tx.purchaseOrderLineItem.findMany({
        where: { poId },
      });
      const allFullyReceived = updatedLineItems.every(
        (li) => li.quantityReceived >= li.quantityOrdered
      );
      const anyReceived = updatedLineItems.some((li) => li.quantityReceived > 0);
      const newStatus = allFullyReceived
        ? "RECEIVED"
        : anyReceived
        ? "PARTIAL"
        : po.status;

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: newStatus,
          receivedAt: allFullyReceived ? now : po.receivedAt,
        },
      });
    });

    // Fetch PO info for notification body
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      select: { poNumber: true, vendor: { select: { name: true } } },
    });

    if (po) {
      await createNotification({
        type: "PO_RECEIVED",
        title: "Purchase Order Received",
        body: `${po.poNumber} from ${po.vendor.name} was received.`,
        href: `/inventory/purchase-orders/${poId}`,
        actorId: session.id,
        refId: poId,
        refType: "PurchaseOrder",
      });
    }

    // Low stock check — query fresh stock after transaction committed
    for (const receivable of lineItemReceivables) {
      if (!receivable.quantityReceived || receivable.quantityReceived <= 0) continue;

      const item = await prisma.inventoryItem.findFirst({
        where: {
          purchaseOrderLineItems: { some: { id: receivable.lineItemId } },
        },
        select: {
          id: true,
          brand: true,
          model: true,
          stockQuantity: true,
          reorderPoint: true,
        },
      });

      if (item && item.stockQuantity <= item.reorderPoint) {
        await createNotification({
          type: "LOW_STOCK",
          title: "Low Stock Alert",
          body: `${item.brand} ${item.model} is at ${item.stockQuantity} units (reorder point: ${item.reorderPoint}).`,
          href: `/inventory`,
          actorId: session.id,
          refId: item.id,
          refType: "InventoryItem",
        });
      }
    }

    revalidatePath(`/inventory/purchase-orders/${poId}`);
    revalidatePath("/inventory/purchase-orders");
    revalidatePath("/inventory");
    return {};
  } catch (e: any) {
    return {
      error: e?.message ?? "Failed to receive items. Please try again.",
    };
  }
}

// ─── Cancel PO ───────────────────────────────────────────────────────────────

export async function cancelPO(poId: string): Promise<POFormState> {
  return updatePOStatus(poId, "CANCELLED");
}
