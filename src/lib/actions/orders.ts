"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { OrderStatus, LineItemType, OrderType, PrescriptionSource } from "@prisma/client";
import { generateOrderNumber } from "@/lib/utils/formatters";
import { createNotification } from "@/lib/notifications";
import { uploadPrescriptionScan } from "@/lib/supabase";
import { emailInvoice } from "@/lib/actions/email";
import { redeemReferral } from "@/lib/actions/referrals";

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
  orderTypes: string[];
  orderCategory?: string;
  isDualInvoice: boolean;
  frameBrand?: string;
  frameModel?: string;
  frameColor?: string;
  frameSku?: string;
  frameWholesale?: number;
  frameEyeSize?: string;
  frameBridge?: string;
  frameTemple?: string;
  frameColourCode?: string;
  lensType?: string;
  lensCoating?: string;
  lensDesign?: string;
  lensAddOns?: string[];
  insuranceCoverage?: number;
  referralCredit?: number;
  referralId?: string;
  depositCustomer: number;
  depositReal: number;
  notes?: string;
  labNotes?: string;
  dueDate?: string;
  lineItems: LineItemInput[];
  // Eye exam fields
  examType?: string;
  examPaymentMethod?: string;
  examBillingCode?: string;
  insuranceCoveredAmount?: number;
};

export async function createOrder(input: CreateOrderInput): Promise<{ id: string; orderNumber: string } | { error: string }> {
  const session = await verifyRole("STAFF");

  // Calculate totals from line items
  const lineTotal = input.lineItems.reduce(
    (sum, item) => sum + item.unitPriceCustomer * item.quantity,
    0
  );
  const lineTotalReal = input.lineItems.reduce(
    (sum, item) => sum + item.unitPriceReal * item.quantity,
    0
  );

  // Apply deductions
  const deductions = (input.insuranceCoverage ?? 0) + (input.referralCredit ?? 0);
  const totalCustomer = Math.max(0, lineTotal - deductions);
  const totalReal = Math.max(0, lineTotalReal - deductions);

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
        orderTypes: input.orderTypes,
        orderCategory: input.orderCategory || null,
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
        frameEyeSize: input.frameEyeSize || null,
        frameBridge: input.frameBridge || null,
        frameTemple: input.frameTemple || null,
        frameColourCode: input.frameColourCode || null,
        lensType: input.lensType || null,
        lensCoating: input.lensCoating || null,
        lensDesign: input.lensDesign || null,
        lensAddOns: input.lensAddOns || [],
        insuranceCoverage: input.insuranceCoverage || null,
        referralCredit: input.referralCredit || null,
        referralId: input.referralId || null,
        examType: input.examType || null,
        examPaymentMethod: input.examPaymentMethod || null,
        examBillingCode: input.examBillingCode || null,
        insuranceCoveredAmount: input.insuranceCoveredAmount ?? null,
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

    // Redeem referral if a code was applied
    if (input.referralId) {
      redeemReferral(input.referralId, input.customerId, order.id).catch((err) =>
        console.error("[Referral] Failed to redeem referral:", err)
      );
    }

    void logAudit({ userId: session.id, action: "CREATE", model: "Order", recordId: order.id, changes: { after: { orderNumber: order.orderNumber, customerId: input.customerId } } });
    return { id: order.id, orderNumber: order.orderNumber };
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
  const session = await verifyRole("STAFF");

  const statusTimestamps: Partial<Record<OrderStatus, object>> = {
    LAB_ORDERED: { labOrderedAt: new Date() },
    LAB_RECEIVED: { labReceivedAt: new Date() },
    VERIFIED: { verifiedAt: new Date() },
    READY: { readyAt: new Date() },
    PICKED_UP: { pickedUpAt: new Date() },
  };

  const order = await prisma.order.update({
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
    select: {
      orderNumber: true,
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  const customerName = `${order.customer.firstName} ${order.customer.lastName}`;

  if (newStatus === OrderStatus.READY) {
    await createNotification({
      type: "ORDER_READY",
      title: "Order Ready for Pickup",
      body: `${order.orderNumber} for ${customerName} is ready.`,
      href: `/orders/${orderId}`,
      actorId: session.id,
      refId: orderId,
      refType: "Order",
    });
  } else if (newStatus === OrderStatus.CANCELLED) {
    await createNotification({
      type: "ORDER_CANCELLED",
      title: "Order Cancelled",
      body: `${order.orderNumber} for ${customerName} was cancelled.`,
      href: `/orders/${orderId}`,
      actorId: session.id,
      refId: orderId,
      refType: "Order",
    });
  } else if (newStatus === OrderStatus.LAB_RECEIVED) {
    await createNotification({
      type: "ORDER_LAB_RECEIVED",
      title: "Lab Order Received",
      body: `${order.orderNumber} for ${customerName} arrived from the lab.`,
      href: `/orders/${orderId}`,
      actorId: session.id,
      refId: orderId,
      refType: "Order",
    });
  }

  void logAudit({ userId: session.id, action: "STATUS_CHANGE", model: "Order", recordId: orderId, changes: { after: { status: newStatus } } });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/orders/board");
}

type PickupCompleteOptions = {
  sendReviewRequest: boolean;
  enrollInReferralCampaign: boolean;
  enrollInFamilyPromo?: boolean;
  markAsLowValue: boolean;
  notes?: string;
};

export async function handlePickupComplete(
  orderId: string,
  options: PickupCompleteOptions
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("STAFF");

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        orderNumber: true,
        totalCustomer: true,
        depositCustomer: true,
        balanceCustomer: true,
        insuranceCoverage: true,
        referralCredit: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            familyId: true,
            family: { select: { customers: { select: { id: true } } } },
          },
        },
        lineItems: {
          select: {
            description: true,
            quantity: true,
            unitPriceCustomer: true,
            totalCustomer: true,
          },
        },
      },
    });
    if (!order) return { error: "Order not found" };

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PICKED_UP,
          pickedUpAt: new Date(),
          reviewRequestSent: options.sendReviewRequest,
          referralCampaignEnrolled: options.enrollInReferralCampaign,
          familyPromoCampaignEnrolled: options.enrollInFamilyPromo,
          pickupNotes: options.notes || null,
          statusHistory: {
            create: {
              status: OrderStatus.PICKED_UP,
              note: options.notes || null,
              createdBy: session.name,
            },
          },
        },
      });

      if (options.markAsLowValue) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            marketingOptOut: true,
            optOutReason: "Marked low-value at pickup",
            optOutDate: new Date(),
            optOutBy: session.name,
          },
        });
      }
    });

    // Auto-send invoice email on pickup (generates PDF + sends attachment)
    if (order.customer.email) {
      emailInvoice(orderId).catch((err) =>
        console.error("[Invoice Email] Failed to send on pickup:", err)
      );
    }

    // SMS placeholder — Twilio integration later
    if (options.sendReviewRequest) {
      console.log(`[SMS PLACEHOLDER] Review request for order ${orderId}, customer ${order.customerId}`);
    }

    // Campaign enrollment — fire-and-forget, errors don't fail pickup
    void (async () => {
      try {
        if (options.enrollInReferralCampaign) {
          const campaign = await prisma.campaign.findFirst({
            where: { type: "POST_PURCHASE_REFERRAL", status: "ACTIVE" },
            select: { id: true },
          });
          if (campaign) {
            await prisma.campaignRecipient.upsert({
              where: { campaignId_customerId: { campaignId: campaign.id, customerId: order.customerId } },
              create: { campaignId: campaign.id, customerId: order.customerId, status: "ACTIVE", currentStep: 0 },
              update: { status: "ACTIVE" },
            });
          }
        }

        if (options.enrollInFamilyPromo) {
          const campaign = await prisma.campaign.findFirst({
            where: { type: "FAMILY_ADDON", status: "ACTIVE" },
            select: { id: true },
          });
          if (campaign) {
            const familyMemberIds =
              order.customer?.family?.customers.map((c) => c.id).filter((id) => id !== order.customerId) ?? [];
            await Promise.all(
              familyMemberIds.map((memberId) =>
                prisma.campaignRecipient.upsert({
                  where: { campaignId_customerId: { campaignId: campaign.id, customerId: memberId } },
                  create: { campaignId: campaign.id, customerId: memberId, status: "ACTIVE", currentStep: 0 },
                  update: { status: "ACTIVE" },
                })
              )
            );
          }
        }
      } catch (err) {
        console.error("[Campaign Enrollment] Failed:", err);
      }
    })();

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    revalidatePath("/orders/board");

    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to complete pickup" };
  }
}

export async function uploadPrescriptionScanAction(
  base64: string,
  mimeType: string,
  customerId: string
): Promise<{ url: string } | { error: string }> {
  await verifyRole("STAFF");

  try {
    const url = await uploadPrescriptionScan(base64, mimeType, customerId);
    if (!url) return { error: "Upload failed" };
    return { url };
  } catch (e) {
    console.error(e);
    return { error: "Failed to upload scan" };
  }
}

// ─── Current Glasses Reading ─────────────────────────────────────────────────

type CurrentGlassesInput = {
  customerId: string;
  date?: string;
  odSphere?: number;
  odCylinder?: number;
  odAxis?: number;
  odAdd?: number;
  osSphere?: number;
  osCylinder?: number;
  osAxis?: number;
  osAdd?: number;
  pdBinocular?: number;
  notes?: string;
  imageUrl?: string;
};

export async function recordCurrentGlassesReading(
  input: CurrentGlassesInput
): Promise<{ id: string } | { error: string }> {
  const session = await verifyRole("STAFF");

  if (!input.customerId) return { error: "Customer ID is required" };

  try {
    const prescription = await prisma.$transaction(async (tx) => {
      // Deactivate any previous CURRENT_GLASSES readings for this customer
      await tx.prescription.updateMany({
        where: {
          customerId: input.customerId,
          source: PrescriptionSource.CURRENT_GLASSES,
          isActive: true,
        },
        data: { isActive: false },
      });

      // Create new current glasses reading
      return tx.prescription.create({
        data: {
          customerId: input.customerId,
          source: PrescriptionSource.CURRENT_GLASSES,
          type: "GLASSES",
          date: input.date ? new Date(input.date) : new Date(),
          odSphere: input.odSphere ?? null,
          odCylinder: input.odCylinder ?? null,
          odAxis: input.odAxis ?? null,
          odAdd: input.odAdd ?? null,
          osSphere: input.osSphere ?? null,
          osCylinder: input.osCylinder ?? null,
          osAxis: input.osAxis ?? null,
          osAdd: input.osAdd ?? null,
          pdBinocular: input.pdBinocular ?? null,
          notes: input.notes || null,
          externalImageUrl: input.imageUrl || null,
        },
      });
    });

    void logAudit({
      userId: session.id,
      action: "CREATE",
      model: "Prescription",
      recordId: prescription.id,
      changes: { after: { source: "CURRENT_GLASSES", customerId: input.customerId } },
    });
    revalidatePath(`/customers/${input.customerId}`);
    return { id: prescription.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save current glasses reading" };
  }
}

type ExternalPrescriptionInput = {
  customerId: string;
  doctorName?: string;
  doctorLicense?: string;
  rxDate?: string;
  notes?: string;
  odSphere?: number;
  odCylinder?: number;
  odAxis?: number;
  odAdd?: number;
  odPd?: number;
  osSphere?: number;
  osCylinder?: number;
  osAxis?: number;
  osAdd?: number;
  osPd?: number;
  pdBinocular?: number;
  imageUrl?: string;
};

export async function addExternalPrescription(
  input: ExternalPrescriptionInput
): Promise<{ id: string } | { error: string }> {
  await verifyRole("STAFF");

  try {
    const prescription = await prisma.prescription.create({
      data: {
        customerId: input.customerId,
        source: PrescriptionSource.EXTERNAL,
        date: input.rxDate ? new Date(input.rxDate) : new Date(),
        doctorName: input.doctorName || null,
        externalDoctor: input.doctorName || null,
        externalLicense: input.doctorLicense || null,
        externalRxDate: input.rxDate ? new Date(input.rxDate) : null,
        externalImageUrl: input.imageUrl || null,
        externalNotes: input.notes || null,
        odSphere: input.odSphere ?? null,
        odCylinder: input.odCylinder ?? null,
        odAxis: input.odAxis ?? null,
        odAdd: input.odAdd ?? null,
        odPd: input.odPd ?? null,
        osSphere: input.osSphere ?? null,
        osCylinder: input.osCylinder ?? null,
        osAxis: input.osAxis ?? null,
        osAdd: input.osAdd ?? null,
        osPd: input.osPd ?? null,
        pdBinocular: input.pdBinocular ?? null,
      },
    });

    revalidatePath(`/customers/${input.customerId}`);
    return { id: prescription.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save prescription" };
  }
}

type TranscribeResult = {
  doctorName: string | null;
  doctorLicense: string | null;
  date: string | null;
  notes: string | null;
  OD: { sphere: string | null; cylinder: string | null; axis: string | null; add: string | null; prism: string | null };
  OS: { sphere: string | null; cylinder: string | null; axis: string | null; add: string | null; prism: string | null };
  PD: { distance: string | null; near: string | null };
};

export async function transcribePrescriptionImage(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<{ data: TranscribeResult } | { error: string }> {
  await verifyRole("STAFF");

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `You are an optical prescription reader. Extract all values from this prescription image.
Return ONLY valid JSON with this structure:
{
  "doctorName": "",
  "doctorLicense": "",
  "date": "YYYY-MM-DD",
  "notes": "",
  "OD": {"sphere": "", "cylinder": "", "axis": "", "add": "", "prism": ""},
  "OS": {"sphere": "", "cylinder": "", "axis": "", "add": "", "prism": ""},
  "PD": {"distance": "", "near": ""}
}
Use null for any field that cannot be read clearly. Return ONLY the JSON object, no markdown, no explanation.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const data = JSON.parse(text) as TranscribeResult;
    return { data };
  } catch (e) {
    console.error(e);
    return { error: "Failed to transcribe prescription image" };
  }
}

export async function updateOrderNotes(
  orderId: string,
  data: { notes?: string; labNotes?: string; dueDate?: string }
) {
  await verifyRole("STAFF");

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
  await verifyRole("STAFF");

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
