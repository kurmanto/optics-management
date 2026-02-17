import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReceivingWorkflow from "@/components/inventory/ReceivingWorkflow";
import POStatusForm from "@/components/inventory/POStatusForm";
import { updatePOStatus, receivePOItems } from "@/lib/actions/purchase-orders";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Draft",     className: "bg-gray-100 text-gray-600" },
  SENT:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  CONFIRMED: { label: "Confirmed", className: "bg-indigo-100 text-indigo-700" },
  PARTIAL:   { label: "Partial",   className: "bg-yellow-100 text-yellow-700" },
  RECEIVED:  { label: "Received",  className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

function fDate(d: any) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString();
}
function fCur(n: number) { return "CAD " + n.toFixed(2); }

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      vendor: true,
      lineItems: {
        include: { inventoryItem: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!po) notFound();

  const badge = STATUS_BADGE[po.status] || { label: po.status, className: "bg-gray-100 text-gray-600" };
  const canReceive = ["DRAFT", "SENT", "CONFIRMED", "PARTIAL"].includes(po.status);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/inventory/purchase-orders" className="hover:text-gray-700">Purchase Orders</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{po.poNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{po.poNumber}</h1>
            <span className={"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold " + badge.className}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{po.vendor.name}</p>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Expected</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{fDate(po.expectedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Received</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{fDate(po.receivedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Shipping</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{fCur(po.shipping)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Duties</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{fCur(po.duties)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            {po.notes && <p className="text-sm text-gray-600">{po.notes}</p>}
            <p className="text-xs text-gray-400 mt-1">Created {fDate(po.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Subtotal: {fCur(po.subtotal)}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">Total: {fCur(po.total)}</p>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
                <th className="pb-2 pr-4">Frame</th>
                <th className="pb-2 pr-4 text-center">Ordered</th>
                <th className="pb-2 pr-4 text-center">Received</th>
                <th className="pb-2 pr-4 text-right">Unit Cost</th>
                <th className="pb-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {po.lineItems.map((li) => (
                <tr key={li.id} className="border-b border-gray-50">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-gray-800">{li.inventoryItem.brand} {li.inventoryItem.model}</p>
                    {li.inventoryItem.sku && <p className="text-xs text-gray-400">{li.inventoryItem.sku}</p>}
                  </td>
                  <td className="py-2.5 pr-4 text-center text-gray-700">{li.quantityOrdered}</td>
                  <td className="py-2.5 pr-4 text-center">
                    <span className={li.quantityReceived >= li.quantityOrdered ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                      {li.quantityReceived}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-700">{fCur(li.unitCost)}</td>
                  <td className="py-2.5 text-right font-medium text-gray-800">{fCur(li.quantityOrdered * li.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status actions */}
      {canReceive && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Update Status</h2>
          <POStatusForm poId={po.id} status={po.status} action={updatePOStatus} />
        </div>
      )}

      {/* Receiving workflow */}
      {canReceive && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <ReceivingWorkflow
            po={po as any}
            action={receivePOItems}
          />
        </div>
      )}
    </div>
  );
}
