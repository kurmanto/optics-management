import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ChevronLeft, FileText, Receipt } from "lucide-react";
import { OrderStatus, InvoiceType } from "@prisma/client";
import { OrderStatusActions } from "@/components/orders/OrderStatusActions";

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  LAB_ORDERED: "Lab Ordered",
  LAB_RECEIVED: "Lab Received",
  VERIFIED: "Verified (Rx Check)",
  READY: "Ready for Pickup",
  PICKED_UP: "Picked Up",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  LAB_ORDERED: "bg-orange-100 text-orange-700",
  LAB_RECEIVED: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-indigo-100 text-indigo-700",
  READY: "bg-green-100 text-green-700",
  PICKED_UP: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-700",
};

// Status workflow: what can come next
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  DRAFT: OrderStatus.CONFIRMED,
  CONFIRMED: OrderStatus.LAB_ORDERED,
  LAB_ORDERED: OrderStatus.LAB_RECEIVED,
  LAB_RECEIVED: OrderStatus.VERIFIED,
  VERIFIED: OrderStatus.READY,
  READY: OrderStatus.PICKED_UP,
};

const NEXT_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  DRAFT: "Confirm Order",
  CONFIRMED: "Send to Lab",
  LAB_ORDERED: "Mark Lab Received",
  LAB_RECEIVED: "Verify Rx",
  VERIFIED: "Mark Ready for Pickup",
  READY: "Mark Picked Up",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const [order, issuedInvoice] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, marketingOptOut: true } },
        user: { select: { name: true } },
        prescription: true,
        insurancePolicy: true,
        lineItems: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.invoice.findFirst({
      where: { orderId: id, type: InvoiceType.CUSTOMER },
      select: { generatedAt: true },
    }),
  ]);

  if (!order) notFound();

  const nextStatus = NEXT_STATUS[order.status];
  const hasFrameOrLens = order.lineItems.some(
    (li) => li.type === "FRAME" || li.type === "LENS"
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <span className={`text-sm px-2.5 py-1 rounded-md font-medium ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Created {formatDate(order.createdAt)} by {order.user.name}
            </p>
          </div>
        </div>

        {/* Work Order Link */}
        <div className="flex items-center gap-2">
          <Link
            href={`/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-1.5 text-xs border rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 text-gray-500 border-gray-300"
          >
            <Receipt className="w-3.5 h-3.5" />
            Invoice
            {issuedInvoice && (
              <span className="ml-1 text-green-600 font-semibold">✓</span>
            )}
          </Link>
          {hasFrameOrLens && (
            <Link
              href={`/orders/${order.id}/work-order`}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Work Order
            </Link>
          )}

        {/* Status Advance Button */}
        {nextStatus && (
          <OrderStatusActions
            orderId={order.id}
            nextStatus={nextStatus}
            nextLabel={NEXT_STATUS_LABELS[order.status]!}
            currentStatus={order.status}
            orderType={order.type}
            orderTotal={order.totalCustomer}
            customerMarketingOptOut={order.customer.marketingOptOut ?? false}
          />
        )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
            <Link
              href={`/customers/${order.customerId}`}
              className="font-medium text-primary hover:underline"
            >
              {order.customer.firstName} {order.customer.lastName}
            </Link>
            {order.customer.phone && (
              <p className="text-sm text-gray-500 mt-1">{order.customer.phone}</p>
            )}
          </div>

          {/* Frame Details */}
          {(order.frameBrand || order.lensType) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Frame & Lens</h2>
              <dl className="space-y-2 text-sm">
                {order.frameBrand && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Brand</dt>
                    <dd className="font-medium">{order.frameBrand}</dd>
                  </div>
                )}
                {order.frameModel && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Model</dt>
                    <dd className="font-medium">{order.frameModel}</dd>
                  </div>
                )}
                {order.frameColor && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Color</dt>
                    <dd className="font-medium">{order.frameColor}</dd>
                  </div>
                )}
                {order.lensType && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Lens Type</dt>
                    <dd className="font-medium">{order.lensType}</dd>
                  </div>
                )}
                {order.lensCoating && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Coating</dt>
                    <dd className="font-medium">{order.lensCoating}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Insurance */}
          {order.insurancePolicy && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Insurance</h2>
              <p className="text-sm font-medium">{order.insurancePolicy.providerName}</p>
              {order.insurancePolicy.policyNumber && (
                <p className="text-xs text-gray-500">Policy: {order.insurancePolicy.policyNumber}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {(order.notes || order.labNotes) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              {order.notes && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Internal Notes
                  </h3>
                  <p className="text-sm text-gray-700">{order.notes}</p>
                </div>
              )}
              {order.labNotes && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Lab Notes
                  </h3>
                  <p className="text-sm text-gray-700">{order.labNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Description</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Qty</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Price</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-400 capitalize">{item.type.toLowerCase().replace("_", " ")}</p>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{formatCurrency(item.unitPriceCustomer)}</td>
                    <td className="px-5 py-3 text-right font-medium">{formatCurrency(item.totalCustomer)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(order.totalCustomer)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-1.5 text-right text-xs text-gray-500">Deposit Paid</td>
                  <td className="px-5 py-1.5 text-right text-xs text-gray-500">{formatCurrency(order.depositCustomer)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-1.5 text-right text-sm font-semibold text-gray-700">Balance Due</td>
                  <td className="px-5 py-1.5 text-right font-bold text-primary">{formatCurrency(order.balanceCustomer)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payments */}
          {order.payments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Payments</h2>
              <div className="space-y-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{p.method.replace("_", " ")}</span>
                      {p.reference && <span className="text-gray-400 ml-2">({p.reference})</span>}
                      <span className="text-gray-400 ml-2">{formatDate(p.paidAt)}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status History */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Status History</h2>
            <div className="space-y-2">
              {order.statusHistory.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    i === order.statusHistory.length - 1 ? "bg-primary" : "bg-gray-300"
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {STATUS_LABELS[h.status]}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(h.createdAt)}</span>
                      {h.createdBy && <span className="text-xs text-gray-400">by {h.createdBy}</span>}
                    </div>
                    {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
