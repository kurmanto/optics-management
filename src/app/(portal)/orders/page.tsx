import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { Plus, Kanban } from "lucide-react";
import { OrderStatus, Prisma } from "@prisma/client";

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  LAB_ORDERED: "Lab Ordered",
  LAB_RECEIVED: "Lab Received",
  VERIFIED: "Verified",
  READY: "Ready",
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

type SearchParams = { q?: string; status?: string; page?: string };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await verifySession();

  const params = await searchParams;

  const query = params.q?.trim() || "";
  const statusFilter = params.status as OrderStatus | undefined;
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 25;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    ...(statusFilter && { status: statusFilter }),
    ...(query && {
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { customer: { firstName: { contains: query, mode: "insensitive" } } },
        { customer: { lastName: { contains: query, mode: "insensitive" } } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} {total === 1 ? "order" : "orders"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/orders/board"
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Kanban className="w-4 h-4" />
            Board
          </Link>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/orders"
          className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
            !statusFilter
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
          <Link
            key={s}
            href={`/orders?status=${s}`}
            className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {query || statusFilter ? "No orders match your filters." : "No orders yet."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Order
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-gray-900 hover:text-primary"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <Link href={`/customers/${order.customerId}`} className="hover:text-primary">
                      {order.customer.firstName} {order.customer.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-medium ${STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(order.totalCustomer)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {formatCurrency(order.balanceCustomer)}
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
                href={`/orders?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(page - 1) })}`}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/orders?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(page + 1) })}`}
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
