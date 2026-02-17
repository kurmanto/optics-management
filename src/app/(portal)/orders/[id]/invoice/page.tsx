import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InvoiceView } from "@/components/orders/InvoiceView";
import { IssueInvoiceButton } from "@/components/orders/IssueInvoiceButton";
import { InvoiceType } from "@prisma/client";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const [order, existingInvoice] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
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
    }),
    prisma.invoice.findFirst({
      where: { orderId: id, type: InvoiceType.CUSTOMER },
      select: { id: true, generatedAt: true },
    }),
  ]);

  if (!order) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Order
        </Link>
        <IssueInvoiceButton
          orderId={order.id}
          issuedAt={existingInvoice?.generatedAt ?? null}
        />
      </div>

      <InvoiceView
        orderNumber={order.orderNumber}
        createdAt={order.createdAt}
        customer={order.customer}
        user={order.user}
        lineItems={order.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCustomer: item.unitPriceCustomer,
          totalCustomer: item.totalCustomer,
        }))}
        totalCustomer={order.totalCustomer}
        depositCustomer={order.depositCustomer}
        balanceCustomer={order.balanceCustomer}
        insuranceCoverage={order.insuranceCoverage}
        referralCredit={order.referralCredit}
        notes={order.notes}
      />
    </div>
  );
}
