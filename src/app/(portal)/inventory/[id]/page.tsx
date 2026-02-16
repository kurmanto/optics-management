import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

const CATEGORY_LABELS: Record<string, string> = {
  OPTICAL: "Optical",
  SUN: "Sun",
  READING: "Reading",
  SAFETY: "Safety",
  SPORT: "Sport",
};

const GENDER_LABELS: Record<string, string> = {
  MENS: "Men's",
  WOMENS: "Women's",
  UNISEX: "Unisex",
  KIDS: "Kids",
};

const RIM_LABELS: Record<string, string> = {
  FULL_RIM: "Full Rim",
  HALF_RIM: "Half Rim",
  RIMLESS: "Rimless",
};

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const item = await prisma.inventoryItem.findUnique({
    where: { id, isActive: true },
  });

  if (!item) notFound();

  const stockColor =
    item.stockQuantity === 0
      ? "text-red-600 bg-red-50"
      : item.stockQuantity <= item.reorderPoint
      ? "text-yellow-700 bg-yellow-50"
      : "text-green-700 bg-green-50";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
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
            </p>
          </div>
        </div>
        <Link
          href={`/inventory/${id}/edit`}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 h-9 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Photo + Stock */}
        <div className="space-y-4">
          {/* Photo */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={`${item.brand} ${item.model}`}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                <Package className="w-12 h-12 mb-2" />
                <span className="text-sm">No photo</span>
              </div>
            )}
          </div>

          {/* Stock Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Stock</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">On hand</span>
              <span className={`text-2xl font-bold px-3 py-1 rounded-lg ${stockColor}`}>
                {item.stockQuantity}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-500">Reorder at</span>
              <span className="text-sm font-medium text-gray-700">{item.reorderPoint}</span>
            </div>
          </div>

          {/* Pricing */}
          {(item.wholesaleCost || item.retailPrice) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Pricing</h2>
              <dl className="space-y-2 text-sm">
                {item.retailPrice && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Retail</dt>
                    <dd className="font-semibold text-gray-900">{formatCurrency(item.retailPrice)}</dd>
                  </div>
                )}
                {item.wholesaleCost && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Wholesale</dt>
                    <dd className="font-medium text-gray-700">{formatCurrency(item.wholesaleCost)}</dd>
                  </div>
                )}
                {item.wholesaleCost && item.retailPrice && (
                  <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                    <dt className="text-gray-500">Margin</dt>
                    <dd className="font-medium text-green-700">
                      {formatCurrency(item.retailPrice - item.wholesaleCost)}
                      {" "}
                      <span className="text-xs text-gray-400">
                        ({Math.round(((item.retailPrice - item.wholesaleCost) / item.retailPrice) * 100)}%)
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Frame Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Frame Details</h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Color</dt>
                <dd className="text-gray-900 font-medium mt-0.5">{item.color || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Material</dt>
                <dd className="text-gray-900 font-medium mt-0.5">{item.material || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Rim Type</dt>
                <dd className="text-gray-900 font-medium mt-0.5">
                  {item.rimType ? RIM_LABELS[item.rimType] : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Size</dt>
                <dd className="text-gray-900 font-medium mt-0.5">{item.size || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Eye Size</dt>
                <dd className="text-gray-900 font-medium mt-0.5">
                  {item.eyeSize ? `${item.eyeSize} mm` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Bridge</dt>
                <dd className="text-gray-900 font-medium mt-0.5">
                  {item.bridgeSize ? `${item.bridgeSize} mm` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Temple</dt>
                <dd className="text-gray-900 font-medium mt-0.5">
                  {item.templeLength ? `${item.templeLength} mm` : "—"}
                </dd>
              </div>
            </dl>
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
