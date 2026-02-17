import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit, Package, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { LedgerReason } from "@prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  OPTICAL: "Optical", SUN: "Sun", READING: "Reading", SAFETY: "Safety", SPORT: "Sport",
};
const GENDER_LABELS: Record<string, string> = {
  MENS: "Men's", WOMENS: "Women's", UNISEX: "Unisex", KIDS: "Kids",
};
const RIM_LABELS: Record<string, string> = {
  FULL_RIM: "Full Rim", HALF_RIM: "Half Rim", RIMLESS: "Rimless",
};
const ABC_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-orange-100 text-orange-700",
};
const LEDGER_LABELS: Record<LedgerReason, string> = {
  PURCHASE_ORDER_RECEIVED: "PO Received",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
  ORDER_COMMITTED: "Order Committed",
  ORDER_FULFILLED: "Order Fulfilled",
  ORDER_CANCELLED: "Order Cancelled",
  PHYSICAL_COUNT: "Physical Count",
  DAMAGED: "Damaged",
  LOST: "Lost",
  RETURN_FROM_CUSTOMER: "Customer Return",
};

function getAgingInfo(firstReceivedAt: Date | null, createdAt: Date) {
  const refDate = firstReceivedAt || createdAt;
  const days = Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 90) return { label: "Fresh", color: "bg-green-100 text-green-700", days };
  if (days < 180) return { label: "3-6 months", color: "bg-yellow-100 text-yellow-700", days };
  if (days < 365) return { label: "6-12 months", color: "bg-orange-100 text-orange-700", days };
  return { label: "12+ months", color: "bg-red-100 text-red-700", days };
}

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const item = await prisma.inventoryItem.findUnique({
    where: { id, isActive: true },
    include: {
      vendor: true,
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!item) notFound();

  const available = item.stockQuantity - item.committedQty;
  const aging = getAgingInfo(item.firstReceivedAt, item.createdAt);
  const cost = item.landedCost || item.wholesaleCost || 0;
  const totalInvested = item.stockQuantity * cost;
  const margin = item.wholesaleCost && item.retailPrice
    ? ((item.retailPrice - item.wholesaleCost) / item.retailPrice) * 100
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {item.brand} {item.model}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {CATEGORY_LABELS[item.category]} · {GENDER_LABELS[item.gender]}
              {item.sku && ` · SKU: ${item.sku}`}
              {item.vendor && ` · ${item.vendor.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/inventory/purchase-orders/new?item=${id}`}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 h-9 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Reorder
          </Link>
          <Link
            href={`/inventory/${id}/edit`}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 h-9 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Photo */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={`${item.brand} ${item.model}`} className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                <Package className="w-12 h-12 mb-2" />
                <span className="text-sm">No photo</span>
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Stock Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">On Hand</span>
                <span className="font-bold text-gray-900 text-lg">{item.stockQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Committed</span>
                <span className="font-medium text-gray-700">{item.committedQty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">On Order</span>
                <span className={`font-medium ${item.onOrderQty > 0 ? "text-blue-600" : "text-gray-700"}`}>{item.onOrderQty}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="text-gray-500">Available</span>
                <span className={`font-bold text-lg ${
                  available <= 0 ? "text-red-600" : available <= item.reorderPoint ? "text-yellow-600" : "text-green-700"
                }`}>
                  {available}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Reorder at</span>
                <span className="text-gray-500">{item.reorderPoint}</span>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Financial</h2>
            <dl className="space-y-2 text-sm">
              {item.wholesaleCost != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Wholesale</dt>
                  <dd className="font-medium text-gray-900">{formatCurrency(item.wholesaleCost)}</dd>
                </div>
              )}
              {item.landedCost != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Landed Cost</dt>
                  <dd className="font-medium text-gray-900">{formatCurrency(item.landedCost)}</dd>
                </div>
              )}
              {item.retailPrice != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Retail Price</dt>
                  <dd className="font-semibold text-gray-900">{formatCurrency(item.retailPrice)}</dd>
                </div>
              )}
              {margin !== null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Margin</dt>
                  <dd className="font-medium text-green-700">{Math.round(margin)}%</dd>
                </div>
              )}
              {item.markdownPct > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Markdown</dt>
                  <dd className="font-medium text-orange-600">{item.markdownPct}% off</dd>
                </div>
              )}
              {totalInvested > 0 && (
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <dt className="text-gray-500">Total Invested</dt>
                  <dd className="font-medium text-gray-900">{formatCurrency(totalInvested)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Frame Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Frame Details</h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><dt className="text-gray-500">Color</dt><dd className="text-gray-900 font-medium mt-0.5">{item.color || "—"}</dd></div>
              <div><dt className="text-gray-500">Color Code</dt><dd className="text-gray-900 font-medium mt-0.5">{item.colorCode || "—"}</dd></div>
              <div><dt className="text-gray-500">Material</dt><dd className="text-gray-900 font-medium mt-0.5">{item.material || "—"}</dd></div>
              <div><dt className="text-gray-500">Rim Type</dt><dd className="text-gray-900 font-medium mt-0.5">{item.rimType ? RIM_LABELS[item.rimType] : "—"}</dd></div>
              <div><dt className="text-gray-500">Size</dt><dd className="text-gray-900 font-medium mt-0.5">{item.size || "—"}</dd></div>
              <div><dt className="text-gray-500">Eye Size</dt><dd className="text-gray-900 font-medium mt-0.5">{item.eyeSize ? `${item.eyeSize} mm` : "—"}</dd></div>
              <div><dt className="text-gray-500">Bridge</dt><dd className="text-gray-900 font-medium mt-0.5">{item.bridgeSize ? `${item.bridgeSize} mm` : "—"}</dd></div>
              <div><dt className="text-gray-500">Temple</dt><dd className="text-gray-900 font-medium mt-0.5">{item.templeLength ? `${item.templeLength} mm` : "—"}</dd></div>
              {item.upc && <div><dt className="text-gray-500">UPC</dt><dd className="text-gray-900 font-mono text-xs mt-0.5">{item.upc}</dd></div>}
              {item.countryOfOrigin && <div><dt className="text-gray-500">Origin</dt><dd className="text-gray-900 font-medium mt-0.5">{item.countryOfOrigin}</dd></div>}
            </dl>
          </div>

          {/* Performance + Aging */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Performance</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Units Sold (all time)</dt>
                  <dd className="font-medium text-gray-900">{item.totalUnitsSold}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">First Received</dt>
                  <dd className="text-gray-900">
                    {item.firstReceivedAt
                      ? new Date(item.firstReceivedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Last Sold</dt>
                  <dd className="text-gray-900">
                    {item.lastSoldAt
                      ? new Date(item.lastSoldAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                      : "Never sold"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Age in Stock</dt>
                  <dd className="text-gray-900">{aging.days} days</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Aging & Health</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${aging.color}`}>
                    {aging.label}
                  </span>
                  {item.abcCategory && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ABC_COLORS[item.abcCategory]}`}>
                      ABC: {item.abcCategory}
                    </span>
                  )}
                </div>
                {item.styleTags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Style Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {item.styleTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 capitalize">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                {item.vendor && (
                  <div className="text-sm">
                    <span className="text-gray-500">Vendor: </span>
                    <Link href={`/inventory/vendors/${item.vendor.id}`} className="text-primary hover:underline font-medium">
                      {item.vendor.name}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stock History Timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Stock History</h2>
            {item.ledgerEntries.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No stock movements recorded yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-4">
                  {item.ledgerEntries.map((entry, idx) => (
                    <div key={entry.id} className="relative pl-8">
                      <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                        entry.quantityChange > 0 ? "bg-green-500" : "bg-red-400"
                      }`} />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{LEDGER_LABELS[entry.reason]}</p>
                          {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
                          {entry.referenceId && (
                            <p className="text-xs text-gray-400 mt-0.5">{entry.referenceType}: {entry.referenceId.slice(0, 8)}…</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-sm font-bold ${entry.quantityChange > 0 ? "text-green-600" : "text-red-500"}`}>
                            {entry.quantityChange > 0 ? "+" : ""}{entry.quantityChange}
                          </span>
                          <p className="text-xs text-gray-400">→ {entry.quantityAfter} units</p>
                          <p className="text-xs text-gray-400">
                            {new Date(entry.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-5">
              <h2 className="font-semibold text-yellow-800 text-sm mb-2">Notes</h2>
              <p className="text-sm text-yellow-700">{item.notes}</p>
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-gray-400 space-y-1">
            {item.legacyItemId && <p>Legacy ID: {item.legacyItemId}</p>}
            <p>Added {new Date(item.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
