import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";
import { MarkDisplayedButton } from "@/components/inventory/MarkDisplayedButton";

export default async function ReceivedFramesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await verifySession();
  const { filter = "not_displayed" } = await searchParams;

  const lineItems = await prisma.purchaseOrderLineItem.findMany({
    where: {
      quantityReceived: { gt: 0 },
      ...(filter === "not_displayed"
        ? { inventoryItem: { is: { isDisplayed: false } } }
        : filter === "displayed"
        ? { inventoryItem: { is: { isDisplayed: true } } }
        : {}),
    },
    include: {
      inventoryItem: {
        select: {
          id: true,
          brand: true,
          model: true,
          sku: true,
          isDisplayed: true,
          displayedAt: true,
          displayLocation: true,
        },
      },
      po: {
        select: {
          poNumber: true,
          id: true,
        },
      },
    },
    orderBy: { receivedAt: "asc" },
  });

  const filterOptions = [
    { value: "not_displayed", label: "Not Yet Displayed" },
    { value: "displayed", label: "Displayed" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/inventory/purchase-orders"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Received Frames</h1>
          <p className="text-sm text-gray-500">Frames received from purchase orders — track display status</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {filterOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/inventory/purchase-orders/received?filter=${opt.value}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === opt.value
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {lineItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center space-y-3">
          <Package className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-gray-500 text-sm">
            {filter === "not_displayed"
              ? "All received frames have been marked as displayed."
              : "No received frames found."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frame</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PO #</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty Received</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Display Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineItems.map((item) => {
                const brand = item.inventoryItem?.brand ?? (item as any).brand ?? "—";
                const model = item.inventoryItem?.model ?? (item as any).model ?? "";
                const sku = item.inventoryItem?.sku ?? (item as any).sku ?? "—";

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{brand} {model}</p>
                      {(item as any).color && (
                        <p className="text-xs text-gray-400">{(item as any).color}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">{sku}</td>
                    <td className="px-5 py-3.5">
                      {item.po ? (
                        <Link
                          href={`/inventory/purchase-orders/${item.po.id}`}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          {item.po.poNumber}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{item.quantityReceived}</td>
                    <td className="px-5 py-3.5">
                      {item.inventoryItem ? (
                        <MarkDisplayedButton
                          inventoryItemId={item.inventoryItem.id}
                          isDisplayed={item.inventoryItem.isDisplayed}
                          displayedAt={item.inventoryItem.displayedAt}
                          displayLocation={item.inventoryItem.displayLocation}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No inventory item linked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
