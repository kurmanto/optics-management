import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/formatters";
import { Search, Package } from "lucide-react";
import { FrameCategory, FrameGender, Prisma } from "@prisma/client";

type SearchParams = {
  q?: string;
  category?: string;
  gender?: string;
  page?: string;
};

const CATEGORY_LABELS: Record<FrameCategory, string> = {
  OPTICAL: "Optical",
  SUN: "Sun",
  READING: "Reading",
  SAFETY: "Safety",
  SPORT: "Sport",
};

const GENDER_LABELS: Record<FrameGender, string> = {
  MENS: "Men's",
  WOMENS: "Women's",
  UNISEX: "Unisex",
  KIDS: "Kids",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await verifySession();

  const params = await searchParams;
  const query = params.q?.trim() || "";
  const categoryFilter = params.category as FrameCategory | undefined;
  const genderFilter = params.gender as FrameGender | undefined;
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const where: Prisma.InventoryItemWhereInput = {
    isActive: true,
    ...(categoryFilter && { category: categoryFilter }),
    ...(genderFilter && { gender: genderFilter }),
    ...(query && {
      OR: [
        { brand: { contains: query, mode: "insensitive" } },
        { model: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { color: { contains: query, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      skip,
      take: limit,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} {total === 1 ? "frame" : "frames"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <form>
            {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
            {genderFilter && <input type="hidden" name="gender" value={genderFilter} />}
            <input
              name="q"
              defaultValue={query}
              type="text"
              placeholder="Search brand, model, SKU..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </form>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(Object.keys(CATEGORY_LABELS) as FrameCategory[]).map((cat) => (
            <Link
              key={cat}
              href={`/inventory?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(genderFilter ? { gender: genderFilter } : {}), ...(categoryFilter === cat ? {} : { category: cat }) })}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        <div className="flex gap-2">
          {(Object.keys(GENDER_LABELS) as FrameGender[]).map((g) => (
            <Link
              key={g}
              href={`/inventory?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(categoryFilter ? { category: categoryFilter } : {}), ...(genderFilter === g ? {} : { gender: g }) })}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                genderFilter === g
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {GENDER_LABELS[g]}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">
              {query || categoryFilter || genderFilter
                ? "No frames match your filters."
                : "No inventory yet. Import frames to get started."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Brand / Model</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">SKU</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Gender</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retail</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{item.brand}</p>
                    <p className="text-xs text-gray-500">{item.model}</p>
                    {item.color && <p className="text-xs text-gray-400">{item.color}</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 hidden md:table-cell text-xs font-mono">
                    {item.sku || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">
                    {CATEGORY_LABELS[item.category]}
                  </td>
                  <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">
                    {GENDER_LABELS[item.gender]}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {item.retailPrice ? formatCurrency(item.retailPrice) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-sm font-medium ${
                        item.stockQuantity === 0
                          ? "text-red-500"
                          : item.stockQuantity <= item.reorderPoint
                          ? "text-yellow-500"
                          : "text-gray-900"
                      }`}
                    >
                      {item.stockQuantity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/inventory?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(categoryFilter ? { category: categoryFilter } : {}), ...(genderFilter ? { gender: genderFilter } : {}), page: String(page - 1) })}`}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/inventory?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(categoryFilter ? { category: categoryFilter } : {}), ...(genderFilter ? { gender: genderFilter } : {}), page: String(page + 1) })}`}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
