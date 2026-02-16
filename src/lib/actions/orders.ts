"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { OrderStatus, LineItemType, OrderType } from "@prisma/client";
import { generateOrderNumber } from "@/lib/utils/formatters";

export type OrderFormState = {
  error?: string;
  orderId?: string;
};

type LineItemInput = {
  type: LineItemType;
  description: string;
  quantity: number;
  unitPriceCustomer: number;
  unitPriceReal: number;
  inventoryItemId?: string;
  notes?: string;
};

type CreateOrderInput = {
  customerId: string;
  prescriptionId?: string;
  insurancePolicyId?: string;
  type: OrderType;
  isDualInvoice: boolean;
  frameBrand?: string;
  frameModel?: string;
  frameColor?: string;
  frameSku?: string;
  frameWholesale?: number;
  lensType?: string;
  lensCoating?: string;
  depositCustomer: number;
  depositReal: number;
  notes?: string;
  labNotes?: string;
  dueDate?: string;
  lineItems: LineItemInput[];
};

export async function createOrder(input: CreateOrderInput): Promise<{ id: string } | { error: string }> {
  const session = await verifySession();

  // Calculate totals
  const totalCustomer = input.lineItems.reduce(
    (sum, item) => sum + item.unitPriceCustomer * item.quantity,
    0
  );
  const totalReal = input.lineItems.reduce(
    (sum, item) => sum + item.unitPriceReal * item.quantity,
    0
  );

  const orderNumber = generateOrderNumber();

  try {
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: input.customerId,
        userId: session.id,
        prescriptionId: input.prescriptionId || null,
        insurancePolicyId: input.insurancePolicyId || null,
        type: input.type,
        status: OrderStatus.DRAFT,
        isDualInvoice: input.isDualInvoice,
        totalCustomer,
        depositCustomer: input.depositCustomer,
        balanceCustomer: totalCustomer - input.depositCustomer,
        totalReal,
        depositReal: input.depositReal,
        balanceReal: totalReal - input.depositReal,
        frameBrand: input.frameBrand || null,
        frameModel: input.frameModel || null,
        frameColor: input.frameColor || null,
        frameSku: input.frameSku || null,
        frameWholesale: input.frameWholesale || null,
        lensType: input.lensType || null,
        lensCoating: input.lensCoating || null,
        notes: input.notes || null,
        labNotes: input.labNotes || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        lineItems: {
          create: input.lineItems.map((item) => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCustomer: item.unitPriceCustomer,
            unitPriceReal: item.unitPriceReal,
            totalCustomer: item.unitPriceCustomer * item.quantity,
            totalReal: item.unitPriceReal * item.quantity,
            inventoryItemId: item.inventoryItemId || null,
            notes: item.notes || null,
          })),
        },
        statusHistory: {
          create: {
            status: OrderStatus.DRAFT,
            note: "Order created",
            createdBy: session.name,
          },
        },
      },
    });

    return { id: order.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create order" };
  }
}

export async function advanceOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
) {
  const session = await verifySession();

  const statusTimestamps: Partial<Record<OrderStatus, object>> = {
    LAB_ORDERED: { labOrderedAt: new Date() },
    LAB_RECEIVED: { labReceivedAt: new Date() },
    READY: { readyAt: new Date() },
    PICKED_UP: { pickedUpAt: new Date() },
  };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      ...(statusTimestamps[newStatus] || {}),
      statusHistory: {
        create: {
          status: newStatus,
          note: note || null,
          createdBy: session.name,
        },
      },
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/orders/board");
}

export async function updateOrderNotes(
  orderId: string,
  data: { notes?: string; labNotes?: string; dueDate?: string }
) {
  await verifySession();

  await prisma.order.update({
    where: { id: orderId },
    data: {
      notes: data.notes !== undefined ? data.notes || null : undefined,
      labNotes: data.labNotes !== undefined ? data.labNotes || null : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });

  revalidatePath(`/orders/${orderId}`);
}

export async function addPayment(
  orderId: string,
  amount: number,
  method: string,
  reference?: string,
  note?: string
) {
  await verifySession();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        orderId,
        amount,
        method: method as any,
        reference: reference || null,
        note: note || null,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        depositCustomer: order.depositCustomer + amount,
        balanceCustomer: order.balanceCustomer - amount,
      },
    }),
  ]);

  revalidatePath(`/orders/${orderId}`);
}
