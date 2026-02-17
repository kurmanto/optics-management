import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Draft",     className: "bg-gray-100 text-gray-600" },
  SENT:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  CONFIRMED: { label: "Confirmed", className: "bg-indigo-100 text-indigo-700" },
  PARTIAL:   { label: "Partial",   className: "bg-yellow-100 text-yellow-700" },
  RECEIVED:  { label: "Received",  className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

type StatusFilter = "all" | "open" | "received" | "cancelled";

const OPEN_STATUSES = ["DRAFT", "SENT", "CONFIRMED", "PARTIAL"];

// helpers
function fDate(d: any) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString();
}

function fCur(n: number) { return "CAD " + n.toFixed(2); }

type PO = {
  id: string;
  poNumber: string;
  status: string;
  expectedAt: Date | null;
  total: number;
  createdAt: Date;
  vendor: { name: string };
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await verifySession();
  const params = await searchParams;
  const statusFilter = (params.status || "all") as StatusFilter;

  const allPOs = await prisma.purchaseOrder.findMany({
    include: { vendor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  }) as PO[];

  const filtered =
    statusFilter === "all" ? allPOs
    : statusFilter === "open" ? allPOs.filter((p) => OPEN_STATUSES.includes(p.status))
    : statusFilter === "received" ? allPOs.filter((p) => p.status === "RECEIVED")
    : allPOs.filter((p) => p.status === "CANCELLED");

  const TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all",       label: "All",       count: allPOs.length },
    { key: "open",      label: "Open",      count: allPOs.filter((p) => OPEN_STATUSES.includes(p.status)).length },
    { key: "received",  label: "Received",  count: allPOs.filter((p) => p.status === "RECEIVED").length },
    { key: "cancelled", label: "Cancelled", count: allPOs.filter((p) => p.status === "CANCELLED").length },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage vendor orders and stock receiving</p>
        </div>
        <Link href="/inventory/purchase-orders/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90">
          + New PO
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((tab) => (
          <Link key={tab.key} href={"/inventory/purchase-orders" + (tab.key === "all" ? "" : "?status=" + tab.key)}
            className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (statusFilter === tab.key ? "border-primary text-primary" : "border-transparent text-gray-500")}>
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No purchase orders found.</p>
            <Link href="/inventory/purchase-orders/new" className="mt-2 inline-block text-sm text-primary hover:underline">Create your first PO</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-500">
                  <th className="px-4 py-3">PO #</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((po) => {
                  const badge = STATUS_BADGE[po.status] || { label: po.status, className: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={po.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={"/inventory/purchase-orders/" + po.id} className="font-mono text-primary hover:underline font-medium">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{po.vendor.name}</td>
                      <td className="px-4 py-3">
                        <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " + badge.className}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fDate(po.expectedAt)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fCur(po.total)}</td>
                      <td className="px-4 py-3 text-gray-500">{fDate(po.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
