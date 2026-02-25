import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { formatPhone, formatDate, formatCurrency } from "@/lib/utils/formatters";
import { Plus, Search, UserCircle2, Star } from "lucide-react";
import { Prisma } from "@prisma/client";
import { buttonVariants } from "@/components/ui/Button";
import {
  computeCustomerType,
  computeLTV,
  computeOutstandingBalance,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_COLORS,
  CustomerType,
} from "@/lib/utils/customer";

type SearchParams = { q?: string; page?: string; status?: string; review?: string };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "VIP", label: "VIP" },
  { value: "ACTIVE", label: "Active" },
  { value: "NEW", label: "New" },
  { value: "LAPSED", label: "Lapsed" },
  { value: "DORMANT", label: "Dormant" },
  { value: "LEAD", label: "Leads" },
];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await verifySession();

  const params = await searchParams;
  const query = params.q?.trim() || "";
  const statusFilter = params.status || "";
  const reviewFilter = params.review || "";
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 25;

  const where: Prisma.CustomerWhereInput = {
    isActive: true,
    ...(query && {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        ...(query.replace(/\D/g, "") ? [{ phone: { contains: query.replace(/\D/g, "") } }] : []),
        { legacyCustomerId: { contains: query, mode: "insensitive" } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (statusFilter || reviewFilter) ? 0 : (page - 1) * limit,
      take: (statusFilter || reviewFilter) ? 200 : limit, // fetch more when filtering client-side
      include: {
        family: { select: { name: true } },
        orders: {
          select: {
            totalReal: true,
            balanceReal: true,
            status: true,
            type: true,
            createdAt: true,
            pickedUpAt: true,
          },
          where: { status: { not: "CANCELLED" } },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  // Compute lifecycle for each customer and filter
  type EnrichedCustomer = (typeof customers)[0] & {
    customerType: CustomerType;
    ltv: number;
    lastPurchase: Date | null;
    outstandingBalance: number;
  };

  let enriched: EnrichedCustomer[] = customers.map((c) => {
    const orders = c.orders.map((o) => ({
      status: o.status,
      type: o.type,
      totalReal: o.totalReal,
      balanceReal: o.balanceReal,
      createdAt: o.createdAt,
      pickedUpAt: o.pickedUpAt,
    }));

    const pickedUp = orders.filter((o) => o.status === "PICKED_UP");
    const lastPurchase =
      pickedUp.length > 0
        ? pickedUp.reduce(
            (max, o) =>
              (o.pickedUpAt ?? o.createdAt) > max
                ? o.pickedUpAt ?? o.createdAt
                : max,
            new Date(0)
          )
        : null;

    return {
      ...c,
      customerType: computeCustomerType(orders, c.createdAt),
      ltv: computeLTV(orders),
      lastPurchase: lastPurchase?.getTime() === 0 ? null : lastPurchase,
      outstandingBalance: computeOutstandingBalance(orders),
    };
  });

  if (statusFilter) {
    enriched = enriched.filter((c) => c.customerType === statusFilter);
  }
  if (reviewFilter === "yes") {
    enriched = enriched.filter((c) => c.googleReviewGiven);
  } else if (reviewFilter === "no") {
    enriched = enriched.filter((c) => !c.googleReviewGiven);
  }

  // Paginate after filter if status or review filter is applied
  const isClientFiltered = !!statusFilter || !!reviewFilter;
  const filteredTotal = isClientFiltered ? enriched.length : total;
  const paginatedCustomers = isClientFiltered
    ? enriched.slice((page - 1) * limit, page * limit)
    : enriched;
  const totalPages = Math.ceil(filteredTotal / limit);

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (statusFilter) p.set("status", statusFilter);
    if (reviewFilter) p.set("review", reviewFilter);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    const s = p.toString();
    return `/customers${s ? `?${s}` : ""}`;
  };

  const displayTotal = isClientFiltered ? filteredTotal : total;

  // Build page number list with ellipsis
  const pageNumbers: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pageNumbers.push(i);
    }
    if (page < totalPages - 2) pageNumbers.push("…");
    pageNumbers.push(totalPages);
  }

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {displayTotal.toLocaleString()}{" "}
            {displayTotal === 1 ? "customer" : "customers"}
          </p>
        </div>
        <Link href="/customers/new" className={buttonVariants("primary", "md")}>
          <Plus className="w-4 h-4" />
          New Customer
        </Link>
      </div>

      {/* Search + Lifecycle tabs */}
      <div className="flex-shrink-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <form>
            <input
              name="q"
              defaultValue={query}
              type="text"
              placeholder="Search by name, email, or phone..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </form>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-0.5">
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={buildUrl({ status: opt.value, page: "1" })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex gap-1">
            {[
              { value: "", label: "All Reviews" },
              { value: "yes", label: "Reviewed" },
              { value: "no", label: "Not Reviewed" },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={buildUrl({ review: opt.value, page: "1" })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  reviewFilter === opt.value
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.value && <Star className="w-3 h-3" />}
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Table — fills remaining height */}
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {paginatedCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <UserCircle2 className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">
              {query ? "No customers match your search." : "No customers found."}
            </p>
            {!query && !statusFilter && (
              <Link href="/customers/new" className="mt-3 text-primary text-sm hover:underline">
                Add first customer
              </Link>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lifecycle</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">LTV</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Purchase</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-gray-900 hover:text-primary inline-flex items-center gap-1.5"
                      >
                        {c.lastName}, {c.firstName}
                        {c.googleReviewGiven && (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </Link>
                      {c.legacyCustomerId && (
                        <p className="text-xs text-gray-400">{c.legacyCustomerId}</p>
                      )}
                      {c.outstandingBalance > 0 && (
                        <p className="text-xs text-red-600 font-medium">
                          Balance: {formatCurrency(c.outstandingBalance)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 hidden sm:table-cell">
                      {formatPhone(c.phone)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CUSTOMER_TYPE_COLORS[c.customerType]}`}>
                        {CUSTOMER_TYPE_LABELS[c.customerType]}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-700 font-medium hidden md:table-cell">
                      {c.ltv > 0 ? formatCurrency(c.ltv) : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500 hidden lg:table-cell">
                      {c.lastPurchase ? formatDate(c.lastPurchase) : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-600 hidden lg:table-cell">
                      {c.orders.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination — pinned at bottom */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between text-sm text-gray-600">
          <span>
            {((page - 1) * limit) + 1}–{Math.min(page * limit, displayTotal)} of {displayTotal.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={page > 1 ? buildUrl({ page: String(page - 1) }) : "#"}
              aria-disabled={page <= 1}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                page <= 1
                  ? "border-gray-100 text-gray-300 pointer-events-none"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              ←
            </Link>
            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-gray-400">…</span>
              ) : (
                <Link
                  key={p}
                  href={buildUrl({ page: String(p) })}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-primary text-white"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {p}
                </Link>
              )
            )}
            <Link
              href={page < totalPages ? buildUrl({ page: String(page + 1) }) : "#"}
              aria-disabled={page >= totalPages}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                page >= totalPages
                  ? "border-gray-100 text-gray-300 pointer-events-none"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
