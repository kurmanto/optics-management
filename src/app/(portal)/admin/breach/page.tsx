import { verifyRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BreachReportStatus } from "@prisma/client";

const STATUS_COLORS: Record<BreachReportStatus, string> = {
  OPEN: "bg-red-100 text-red-800",
  INVESTIGATING: "bg-yellow-100 text-yellow-800",
  IPC_NOTIFIED: "bg-blue-100 text-blue-800",
  INDIVIDUALS_NOTIFIED: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
};

export default async function BreachListPage() {
  await verifyRole("ADMIN");

  const reports = await prisma.breachReport.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Breach Reports</h1>
          <p className="text-sm text-gray-500 mt-1">PHIPA breach notification records</p>
        </div>
        <Link
          href="/admin/breach/new"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          Report New Breach
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No breach reports on file.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Discovered</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Affected</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Reported</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    {r.discoveredAt.toLocaleDateString("en-CA")}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs">
                    <span className="line-clamp-2">{r.description}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.affectedCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.createdAt.toLocaleDateString("en-CA")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/breach/${r.id}`}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      View →
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
