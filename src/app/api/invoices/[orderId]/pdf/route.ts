import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

function invoiceNumber(orderNumber: string): string {
  const parts = orderNumber.split("-");
  const last = parts[parts.length - 1];
  return last.padStart(4, "0");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  await verifySession();

  const { orderId } = await params;
  const mode =
    request.nextUrl.searchParams.get("mode") === "internal"
      ? "internal"
      : "customer";

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
      lineItems: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

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

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="MintVision-Invoice-${invNum}.pdf"`,
    },
  });
}
