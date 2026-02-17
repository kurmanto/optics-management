import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit, Package, Mail, Phone, Globe, MapPin, Clock, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  CONFIRMED: "Confirmed",
  PARTIAL: "Partial",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  RECEIVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id, isActive: true },
    include: {
      inventoryItems: {
        where: { isActive: true },
        orderBy: [{ brand: "asc" }, { model: "asc" }],
        take: 20,
        select: { id: true, brand: true, model: true, color: true, stockQuantity: true, retailPrice: true },
      },
      purchaseOrders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, poNumber: true, status: true, createdAt: true, total: true, expectedAt: true },
      },
      _count: { select: { inventoryItems: { where: { isActive: true } }, purchaseOrders: true } },
    },
  });

  if (!vendor) notFound();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory/vendors" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {vendor._count.inventoryItems} frames · {vendor._count.purchaseOrders} purchase orders
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/inventory/purchase-orders/new?vendorId=${vendor.id}`}
            className="inline-flex items-center gap-2 bg-primary text-white px-3 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors"
          >
            + New PO
          </Link>
          <Link
            href={`/inventory/vendors/${id}/edit`}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 h-9 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Contact</h2>
            <dl className="space-y-3 text-sm">
              {vendor.contactName && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">👤</span>
                  <span className="text-gray-900">{vendor.contactName}</span>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">{vendor.email}</a>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={`tel:${vendor.phone}`} className="text-gray-900">{vendor.phone}</a>
                </div>
              )}
              {vendor.website && (
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{vendor.website}</a>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{vendor.address}</span>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Order Terms</h2>
            <dl className="space-y-2 text-sm">
              {vendor.paymentTerms && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Payment</dt>
                  <dd className="font-medium text-gray-900">{vendor.paymentTerms}</dd>
                </div>
              )}
              {vendor.minOrderQty != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Min Order</dt>
                  <dd className="font-medium text-gray-900">{vendor.minOrderQty} units</dd>
                </div>
              )}
              {vendor.leadTimeDays != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Lead Time</dt>
                  <dd className="font-medium text-gray-900">{vendor.leadTimeDays} days</dd>
                </div>
              )}
              {vendor.paymentMethods.length > 0 && (
                <div>
                  <dt className="text-gray-500 mb-1">Accepted Payments</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {vendor.paymentMethods.map((m) => (
                      <span key={m} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{m}</span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {(vendor.repName || vendor.repEmail || vendor.repPhone) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Sales Rep</h2>
              <dl className="space-y-2 text-sm">
                {vendor.repName && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400">👤</span>
                    <span className="text-gray-900">{vendor.repName}</span>
                  </div>
                )}
                {vendor.repEmail && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a href={`mailto:${vendor.repEmail}`} className="text-primary hover:underline">{vendor.repEmail}</a>
                  </div>
                )}
                {vendor.repPhone && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900">{vendor.repPhone}</span>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Right column: items + POs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Inventory Items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Linked Frames</h2>
              <Link href={`/inventory?vendor=${vendor.id}`} className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
            {vendor.inventoryItems.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                No frames linked to this vendor yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frame</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendor.inventoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <Link href={`/inventory/${item.id}`} className="hover:text-primary">
                          <span className="font-medium text-gray-900">{item.brand}</span>
                          <span className="text-gray-500"> {item.model}</span>
                          {item.color && <span className="text-xs text-gray-400 ml-1">({item.color})</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-medium text-sm ${item.stockQuantity === 0 ? "text-red-500" : "text-gray-900"}`}>
                          {item.stockQuantity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {item.retailPrice ? formatCurrency(item.retailPrice) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Purchase Orders */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Purchase Orders</h2>
              <Link href={`/inventory/purchase-orders/new?vendorId=${vendor.id}`} className="text-xs text-primary hover:underline">
                + New PO
              </Link>
            </div>
            {vendor.purchaseOrders.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                No purchase orders for this vendor yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PO #</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Expected</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendor.purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <Link href={`/inventory/purchase-orders/${po.id}`} className="font-mono text-primary hover:underline text-xs">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PO_STATUS_COLORS[po.status]}`}>
                          {PO_STATUS_LABELS[po.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 hidden md:table-cell text-xs">
                        {po.expectedAt
                          ? new Date(po.expectedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(po.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {vendor.notes && (
            <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-5">
              <h2 className="font-semibold text-yellow-800 text-sm mb-2">Notes</h2>
              <p className="text-sm text-yellow-700">{vendor.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
