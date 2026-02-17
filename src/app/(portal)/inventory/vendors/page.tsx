import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";

export default async function VendorsPage() {
  await verifySession();

  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { inventoryItems: { where: { isActive: true } } } },
      purchaseOrders: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true },
      },
    },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {vendors.length} {vendors.length === 1 ? "vendor" : "vendors"}
          </p>
        </div>
        <Link
          href="/inventory/vendors/new"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Vendor
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Truck className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">No vendors yet. Add your first vendor to get started.</p>
            <Link
              href="/inventory/vendors/new"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <Plus className="w-4 h-4" />
              Add vendor
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Lead Time</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frames</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Open POs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/inventory/vendors/${vendor.id}`} className="hover:text-primary">
                      <p className="font-medium text-gray-900">{vendor.name}</p>
                      {vendor.paymentTerms && (
                        <p className="text-xs text-gray-400">{vendor.paymentTerms}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                    {vendor.contactName || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">
                    {vendor.email ? (
                      <a href={`mailto:${vendor.email}`} className="text-primary hover:underline text-xs">
                        {vendor.email}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">
                    {vendor.leadTimeDays != null ? `${vendor.leadTimeDays} days` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {vendor._count.inventoryItems}
                  </td>
                  <td className="px-6 py-4 text-right hidden md:table-cell">
                    <span className={`text-sm font-medium ${vendor.purchaseOrders.length > 0 ? "text-blue-600" : "text-gray-400"}`}>
                      {vendor.purchaseOrders.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
