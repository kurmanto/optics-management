import { verifyRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    model?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await verifyRole("ADMIN");
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(params.model ? { model: params.model } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.from || params.to
      ? {
          createdAt: {
            ...(params.from ? { gte: new Date(params.from) } : {}),
            ...(params.to ? { lte: new Date(params.to + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildQuery = (overrides: Record<string, string>) => {
    const q = new URLSearchParams({
      ...(params.model ? { model: params.model } : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      page: String(page),
      ...overrides,
    });
    return `/admin/audit?${q.toString()}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total.toLocaleString()} records · Page {page} of {Math.max(1, totalPages)}
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
          <select
            name="model"
            defaultValue={params.model ?? ""}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {["Customer", "Order", "InventoryItem", "Vendor", "PurchaseOrder", "FormSubmission", "FormPackage", "InsurancePolicy", "Invoice", "Appointment", "User", "BreachReport"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
          <select
            name="action"
            defaultValue={params.action ?? ""}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {["LOGIN", "LOGOUT", "LOGIN_FAILED", "ACCOUNT_LOCKED", "PASSWORD_CHANGE", "CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "FORM_SUBMITTED", "INTAKE_APPLIED", "PO_RECEIVED", "PO_CANCELLED"].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" name="from" defaultValue={params.from ?? ""} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" name="to" defaultValue={params.to ?? ""} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          Filter
        </button>
        <Link href="/admin/audit" className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          Reset
        </Link>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Timestamp</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Staff</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Action</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Model</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Record ID</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">IP</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {log.createdAt.toLocaleString("en-CA", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {log.user?.name ?? <span className="text-gray-400">System</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 text-gray-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{log.model}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono truncate max-w-xs">
                      {log.recordId}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {log.changes ? (
                        <details className="cursor-pointer">
                          <summary className="text-primary hover:underline">View</summary>
                          <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 max-w-xs overflow-x-auto">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
            {page > 1 && (
              <Link href={buildQuery({ page: String(page - 1) })} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
                ← Prev
              </Link>
            )}
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={buildQuery({ page: String(page + 1) })} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
