import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, Lock } from "lucide-react";
import { InvoiceView } from "@/components/orders/InvoiceView";
import { IssueInvoiceButton } from "@/components/orders/IssueInvoiceButton";
import { InvoiceType } from "@prisma/client";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  await verifySession();
  const { id } = await params;
  const { view } = await searchParams;

  const mode = view === "internal" ? "internal" : "customer";

  const [order, existingInvoice, existingInternalInvoice] = await Promise.all([
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
        prescription: {
          select: {
            doctorName: true,
            date: true,
            source: true,
            odSphere: true,
            odCylinder: true,
            odAxis: true,
            odAdd: true,
            odPd: true,
            osSphere: true,
            osCylinder: true,
            osAxis: true,
            osAdd: true,
            osPd: true,
            pdBinocular: true,
          },
        },
      },
    }),
    prisma.invoice.findFirst({
      where: { orderId: id, type: InvoiceType.CUSTOMER },
      select: { id: true, generatedAt: true },
    }),
    prisma.invoice.findFirst({
      where: { orderId: id, type: InvoiceType.INTERNAL },
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
          isDualInvoice={order.isDualInvoice}
          internalIssuedAt={existingInternalInvoice?.generatedAt ?? null}
        />
      </div>

      {/* Dual-invoice mode toggle — only when isDualInvoice is true */}
      {order.isDualInvoice && (
        <div className="print:hidden flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium flex-1">
            Dual invoice — customer view and internal view available
          </p>
          <div className="flex rounded-lg overflow-hidden border border-amber-300 text-sm">
            <Link
              href={`/orders/${order.id}/invoice`}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                mode === "customer"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-amber-700 hover:bg-amber-50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Customer
            </Link>
            <Link
              href={`/orders/${order.id}/invoice?view=internal`}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                mode === "internal"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-amber-700 hover:bg-amber-50"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Internal
            </Link>
          </div>
        </div>
      )}

      <InvoiceView
        orderId={order.id}
        orderNumber={order.orderNumber}
        createdAt={order.createdAt}
        mode={mode}
        isDualInvoice={order.isDualInvoice}
        customer={order.customer}
        user={order.user}
        lineItems={order.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCustomer: item.unitPriceCustomer,
          totalCustomer: item.totalCustomer,
          unitPriceReal: item.unitPriceReal,
          totalReal: item.totalReal,
        }))}
        totalCustomer={order.totalCustomer}
        depositCustomer={order.depositCustomer}
        balanceCustomer={order.balanceCustomer}
        totalReal={order.totalReal}
        depositReal={order.depositReal}
        balanceReal={order.balanceReal}
        insuranceCoverage={order.insuranceCoverage}
        referralCredit={order.referralCredit}
        notes={order.notes}
        prescription={order.prescription}
      />
    </div>
  );
}
