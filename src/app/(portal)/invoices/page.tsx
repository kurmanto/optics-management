import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { Receipt, ExternalLink } from "lucide-react";
import { InvoiceType } from "@prisma/client";

export default async function InvoicesPage() {
  await verifySession();

  const invoices = await prisma.invoice.findMany({
    where: { type: InvoiceType.CUSTOMER },
    orderBy: { generatedAt: "desc" },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          totalCustomer: true,
          balanceCustomer: true,
          status: true,
          customer: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Receipt className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">All issued customer invoices</p>
        </div>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No invoices issued yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Open an order and click &ldquo;Invoice&rdquo; to issue your first invoice.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Issued
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Order
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Customer
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Balance
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                    {formatDate(inv.generatedAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/orders/${inv.order.id}`}
                      className="font-medium text-gray-900 hover:text-primary transition-colors"
                    >
                      {inv.order.orderNumber}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {inv.order.status.toLowerCase().replace(/_/g, " ")}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">
                      {inv.order.customer.firstName} {inv.order.customer.lastName}
                    </p>
                    {inv.order.customer.email && (
                      <p className="text-xs text-gray-400 mt-0.5">{inv.order.customer.email}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                    {formatCurrency(inv.order.totalCustomer)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={
                        inv.order.balanceCustomer > 0
                          ? "font-semibold text-orange-600"
                          : "text-gray-400"
                      }
                    >
                      {formatCurrency(inv.order.balanceCustomer)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/orders/${inv.order.id}/invoice`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View / Print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
