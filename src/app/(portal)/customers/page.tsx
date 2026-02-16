import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { formatPhone, formatDate } from "@/lib/utils/formatters";
import { Plus, Search, UserCircle2 } from "lucide-react";
import { Prisma } from "@prisma/client";

type SearchParams = { q?: string; page?: string };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await verifySession();

  const params = await searchParams;
  const query = params.q?.trim() || "";
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 25;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    isActive: true,
    ...(query && {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query.replace(/\D/g, "") } },
        { legacyCustomerId: { contains: query, mode: "insensitive" } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take: limit,
      include: {
        family: { select: { name: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} {total === 1 ? "customer" : "customers"}
          </p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </Link>
      </div>

      {/* Search */}
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserCircle2 className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">
              {query ? "No customers match your search." : "No customers yet."}
            </p>
            {!query && (
              <Link
                href="/customers/new"
                className="mt-3 text-primary text-sm hover:underline"
              >
                Add first customer
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Phone
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Family
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Orders
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-medium text-gray-900 hover:text-primary"
                    >
                      {c.lastName}, {c.firstName}
                    </Link>
                    {c.legacyCustomerId && (
                      <p className="text-xs text-gray-400">{c.legacyCustomerId}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatPhone(c.phone)}
                  </td>
                  <td className="px-6 py-4 text-gray-600 hidden md:table-cell">
                    {c.email || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600 hidden lg:table-cell">
                    {c.family?.name || "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {c._count.orders}
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
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/customers?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page - 1) })}`}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/customers?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page + 1) })}`}
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
