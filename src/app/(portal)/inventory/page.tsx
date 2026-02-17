import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/formatters";
import { Search, Package, Plus, X, SlidersHorizontal } from "lucide-react";
import { FrameCategory, FrameGender, Prisma } from "@prisma/client";

type SearchParams = {
  q?: string;
  category?: string;
  gender?: string;
  vendor?: string;
  aging?: string;
  stock?: string;
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

const AGING_OPTIONS = [
  { value: "fresh",   label: "< 3 months",  dot: "bg-green-400" },
  { value: "3-6mo",   label: "3–6 months",  dot: "bg-yellow-400" },
  { value: "6-12mo",  label: "6–12 months", dot: "bg-orange-400" },
  { value: "12mo+",   label: "12 months+",  dot: "bg-red-500" },
];

const STOCK_OPTIONS = [
  { value: "in",    label: "In stock" },
  { value: "low",   label: "Low stock" },
  { value: "out",   label: "Out of stock" },
  { value: "order", label: "On order" },
];

function agingDays(firstReceivedAt: Date | null, createdAt: Date): number {
  const ref = firstReceivedAt || createdAt;
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
}

function getAgingInfo(days: number) {
  if (days < 90)  return { dot: "bg-green-400",  label: "< 3 mo" };
  if (days < 180) return { dot: "bg-yellow-400", label: "3–6 mo" };
  if (days < 365) return { dot: "bg-orange-400", label: "6–12 mo" };
  return           { dot: "bg-red-500",   label: "12 mo+" };
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await verifySession();

  const params = await searchParams;
  const query         = params.q?.trim() || "";
  const categoryFilter = params.category as FrameCategory | undefined;
  const genderFilter   = params.gender as FrameGender | undefined;
  const vendorFilter   = params.vendor || "";
  const agingFilter    = params.aging || "";
  const stockFilter    = params.stock || "";
  const page  = Math.max(1, parseInt(params.page || "1"));
  const limit = 30;
  const skip  = (page - 1) * limit;

  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const allItems = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: { stockQuantity: true, onOrderQty: true, retailPrice: true, reorderPoint: true, firstReceivedAt: true, createdAt: true },
  });

  const totalStock    = allItems.reduce((s, i) => s + i.stockQuantity, 0);
  const totalOnOrder  = allItems.reduce((s, i) => s + i.onOrderQty, 0);
  const totalValue    = allItems.reduce((s, i) => s + i.stockQuantity * (i.retailPrice || 0), 0);
  const lowStockCount = allItems.filter((i) => i.stockQuantity > 0 && i.stockQuantity <= i.reorderPoint).length;

  const where: Prisma.InventoryItemWhereInput = {
    isActive: true,
    ...(categoryFilter && { category: categoryFilter }),
    ...(genderFilter   && { gender: genderFilter }),
    ...(vendorFilter   && { vendorId: vendorFilter }),
    ...(stockFilter === "in"    && { stockQuantity: { gt: 0 } }),
    ...(stockFilter === "out"   && { stockQuantity: 0 }),
    ...(stockFilter === "low"   && { stockQuantity: { gt: 0 } }),
    ...(stockFilter === "order" && { onOrderQty: { gt: 0 } }),
    ...(query && {
      OR: [
        { brand: { contains: query, mode: "insensitive" } },
        { model: { contains: query, mode: "insensitive" } },
        { sku:   { contains: query, mode: "insensitive" } },
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
      include: { vendor: { select: { name: true } } },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  // Aging + low-stock client-side filters
  const filteredItems = items.filter((item) => {
    if (agingFilter) {
      const days = agingDays(item.firstReceivedAt, item.createdAt);
      if (agingFilter === "fresh"  && days >= 90)  return false;
      if (agingFilter === "3-6mo"  && (days < 90  || days >= 180)) return false;
      if (agingFilter === "6-12mo" && (days < 180 || days >= 365)) return false;
      if (agingFilter === "12mo+"  && days < 365)  return false;
    }
    if (stockFilter === "low" && !(item.stockQuantity > 0 && item.stockQuantity <= item.reorderPoint)) return false;
    return true;
  });

  const totalPages = Math.ceil(total / limit);

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams({
      ...(query          ? { q: query }                : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(genderFilter   ? { gender: genderFilter }    : {}),
      ...(vendorFilter   ? { vendor: vendorFilter }    : {}),
      ...(agingFilter    ? { aging: agingFilter }      : {}),
      ...(stockFilter    ? { stock: stockFilter }      : {}),
      ...extra,
    });
    // Remove empty values
    Array.from(p.keys()).forEach((k) => { if (!p.get(k)) p.delete(k); });
    const qs = p.toString();
    return `/inventory${qs ? `?${qs}` : ""}`;
  };

  const activeFilterCount = [categoryFilter, genderFilter, vendorFilter, agingFilter, stockFilter].filter(Boolean).length;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Frames</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} {total === 1 ? "frame" : "frames"} in inventory
          </p>
        </div>
        <Link
          href="/inventory/new"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Item
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Retail Value",  value: formatCurrency(totalValue),          sub: "at current retail",        accent: "text-primary" },
          { label: "Total Stock",   value: totalStock.toLocaleString(),          sub: "units on hand",            accent: "text-gray-900" },
          { label: "On Order",      value: totalOnOrder.toLocaleString(),        sub: "units incoming",           accent: "text-blue-600" },
          { label: "Low Stock",     value: lowStockCount.toLocaleString(),       sub: "items below reorder pt.",  accent: lowStockCount > 0 ? "text-amber-600" : "text-gray-900" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.accent}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Search row */}
        <form className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
          {genderFilter   && <input type="hidden" name="gender"   value={genderFilter} />}
          {vendorFilter   && <input type="hidden" name="vendor"   value={vendorFilter} />}
          {agingFilter    && <input type="hidden" name="aging"    value={agingFilter} />}
          {stockFilter    && <input type="hidden" name="stock"    value={stockFilter} />}
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            name="q"
            defaultValue={query}
            type="text"
            placeholder="Search brand, model, SKU, or color…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
          />
          {query && (
            <Link href={buildUrl({ q: "" })} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </Link>
          )}
        </form>

        {/* Filter rows */}
        <div className="px-4 py-3 space-y-3">

          {/* Category */}
          <FilterRow label="Type">
            <FilterChip href={buildUrl({ category: "" })} active={!categoryFilter}>All</FilterChip>
            {(Object.keys(CATEGORY_LABELS) as FrameCategory[]).map((cat) => (
              <FilterChip
                key={cat}
                href={buildUrl({ category: categoryFilter === cat ? "" : cat })}
                active={categoryFilter === cat}
              >
                {CATEGORY_LABELS[cat]}
              </FilterChip>
            ))}
          </FilterRow>

          {/* Gender */}
          <FilterRow label="Gender">
            <FilterChip href={buildUrl({ gender: "" })} active={!genderFilter}>All</FilterChip>
            {(Object.keys(GENDER_LABELS) as FrameGender[]).map((g) => (
              <FilterChip
                key={g}
                href={buildUrl({ gender: genderFilter === g ? "" : g })}
                active={genderFilter === g}
              >
                {GENDER_LABELS[g]}
              </FilterChip>
            ))}
          </FilterRow>

          {/* Stock status */}
          <FilterRow label="Stock">
            <FilterChip href={buildUrl({ stock: "" })} active={!stockFilter}>Any</FilterChip>
            {STOCK_OPTIONS.map((s) => (
              <FilterChip
                key={s.value}
                href={buildUrl({ stock: stockFilter === s.value ? "" : s.value })}
                active={stockFilter === s.value}
              >
                {s.label}
              </FilterChip>
            ))}
          </FilterRow>

          {/* Aging */}
          <FilterRow label="Age">
            <FilterChip href={buildUrl({ aging: "" })} active={!agingFilter}>Any</FilterChip>
            {AGING_OPTIONS.map((a) => (
              <FilterChip
                key={a.value}
                href={buildUrl({ aging: agingFilter === a.value ? "" : a.value })}
                active={agingFilter === a.value}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${a.dot} inline-block`} />
                {a.label}
              </FilterChip>
            ))}
          </FilterRow>

          {/* Vendor */}
          {vendors.length > 0 && (
            <FilterRow label="Vendor">
              <FilterChip href={buildUrl({ vendor: "" })} active={!vendorFilter}>All</FilterChip>
              {vendors.map((v) => (
                <FilterChip
                  key={v.id}
                  href={buildUrl({ vendor: vendorFilter === v.id ? "" : v.id })}
                  active={vendorFilter === v.id}
                >
                  {v.name}
                </FilterChip>
              ))}
            </FilterRow>
          )}
        </div>

        {/* Active filter summary bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
              &nbsp;·&nbsp;
              {filteredItems.length} of {total} shown
            </span>
            <Link
              href={`/inventory${query ? `?q=${encodeURIComponent(query)}` : ""}`}
              className="flex items-center gap-1 font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear all
            </Link>
          </div>
        )}
      </div>

      {/* Results table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">No frames match your filters</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting or clearing the active filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="w-14 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Frame</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden xl:table-cell">Vendor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Retail</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">On Hand</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">On Order</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((item) => {
                const days      = agingDays(item.firstReceivedAt, item.createdAt);
                const aging     = getAgingInfo(days);
                const available = item.stockQuantity - item.committedQty;
                const isLow     = item.stockQuantity > 0 && item.stockQuantity <= item.reorderPoint;
                const isOut     = item.stockQuantity === 0;

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">

                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${item.id}`}>
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Brand / Model / Age */}
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${item.id}`} className="block group-hover:text-primary transition-colors">
                        <span className="font-semibold text-gray-900">{item.brand}</span>
                        <span className="text-gray-400 mx-1.5">·</span>
                        <span className="text-gray-600">{item.model}</span>
                        {item.color && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.color}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${aging.dot} flex-shrink-0`} />
                          <span className="text-xs text-gray-400">{aging.label}</span>
                        </div>
                      </Link>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                      <span className="font-mono text-xs">{item.sku || "—"}</span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>

                    {/* Vendor */}
                    <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                      {item.vendor?.name || "—"}
                    </td>

                    {/* Retail */}
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {item.retailPrice ? formatCurrency(item.retailPrice) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* On Hand */}
                    <td className="px-4 py-3 text-right">
                      {isOut ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-600">Out</span>
                      ) : isLow ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">{item.stockQuantity}</span>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{item.stockQuantity}</span>
                      )}
                    </td>

                    {/* On Order */}
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {item.onOrderQty > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">{item.onOrderQty}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Available */}
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className={`text-sm font-medium ${
                        available <= 0 ? "text-red-500" : available <= item.reorderPoint ? "text-amber-600" : "text-gray-700"
                      }`}>
                        {available}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination inside the table card */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
            </span>
            <div className="flex gap-1.5">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="inline-flex items-center h-7 px-3 rounded-md border border-gray-200 hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="inline-flex items-center h-7 px-3 rounded-md border border-gray-200 hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 min-h-[28px]">
      <span className="text-xs font-medium text-gray-400 w-12 flex-shrink-0 text-right">{label}</span>
      <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-all duration-100 ${
        active
          ? "bg-gray-900 text-white shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </Link>
  );
}
