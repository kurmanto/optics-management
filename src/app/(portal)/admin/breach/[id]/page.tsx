import { verifyRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { generateIPCNotificationText, updateBreachStatus } from "@/lib/actions/breach";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreachReportStatus } from "@prisma/client";

const STATUS_ORDER: BreachReportStatus[] = [
  "OPEN",
  "INVESTIGATING",
  "IPC_NOTIFIED",
  "INDIVIDUALS_NOTIFIED",
  "RESOLVED",
];

const STATUS_LABELS: Record<BreachReportStatus, string> = {
  OPEN: "Open",
  INVESTIGATING: "Investigating",
  IPC_NOTIFIED: "IPC Notified",
  INDIVIDUALS_NOTIFIED: "Individuals Notified",
  RESOLVED: "Resolved",
};

const STATUS_COLORS: Record<BreachReportStatus, string> = {
  OPEN: "bg-red-100 text-red-800 border-red-200",
  INVESTIGATING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  IPC_NOTIFIED: "bg-blue-100 text-blue-800 border-blue-200",
  INDIVIDUALS_NOTIFIED: "bg-purple-100 text-purple-800 border-purple-200",
  RESOLVED: "bg-green-100 text-green-800 border-green-200",
};

export default async function BreachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyRole("ADMIN");
  const { id } = await params;

  const report = await prisma.breachReport.findUnique({ where: { id } });
  if (!report) notFound();

  const ipcText = await generateIPCNotificationText(id);

  const currentIdx = STATUS_ORDER.indexOf(report.status);
  const nextStatus = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;

  async function advanceStatus() {
    "use server";
    if (!nextStatus) return;
    const notifiedAt = ["IPC_NOTIFIED", "INDIVIDUALS_NOTIFIED"].includes(nextStatus)
      ? new Date()
      : undefined;
    await updateBreachStatus(id, nextStatus, notifiedAt);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/breach" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Breach Reports
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">Breach Report</h1>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[report.status]}`}>
            {STATUS_LABELS[report.status]}
          </span>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Status Workflow</h2>
        <div className="flex items-center gap-0">
          {STATUS_ORDER.map((s, i) => {
            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s} className="flex items-center flex-1 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCurrent
                      ? "bg-primary text-white"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? "✓" : i + 1}
                </div>
                <div className="hidden sm:block ml-1 text-xs text-gray-500 truncate flex-1">
                  {STATUS_LABELS[s]}
                </div>
                {i < STATUS_ORDER.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${isCompleted ? "bg-green-400" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
        {nextStatus && (
          <form action={advanceStatus} className="mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              Advance to: {STATUS_LABELS[nextStatus]}
            </button>
          </form>
        )}
      </div>

      {/* Report Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Report Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Discovered</span>
            <p className="text-gray-900 font-medium">{report.discoveredAt.toLocaleDateString("en-CA")}</p>
          </div>
          <div>
            <span className="text-gray-500">Reported</span>
            <p className="text-gray-900 font-medium">{report.createdAt.toLocaleDateString("en-CA")}</p>
          </div>
          <div>
            <span className="text-gray-500">Affected Individuals</span>
            <p className="text-gray-900 font-medium">{report.affectedCount}</p>
          </div>
          <div>
            <span className="text-gray-500">Data Types</span>
            <p className="text-gray-900 font-medium">{report.dataTypes.join(", ")}</p>
          </div>
        </div>
        <div>
          <span className="text-sm text-gray-500">Description</span>
          <p className="text-sm text-gray-900 mt-1">{report.description}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Containment Actions</span>
          <p className="text-sm text-gray-900 mt-1">{report.containmentActions}</p>
        </div>
        {report.ipcNotifiedAt && (
          <div>
            <span className="text-sm text-gray-500">IPC Notified</span>
            <p className="text-sm text-gray-900 mt-1">{report.ipcNotifiedAt.toLocaleDateString("en-CA")}</p>
          </div>
        )}
        {report.individualsNotifiedAt && (
          <div>
            <span className="text-sm text-gray-500">Individuals Notified</span>
            <p className="text-sm text-gray-900 mt-1">{report.individualsNotifiedAt.toLocaleDateString("en-CA")}</p>
          </div>
        )}
      </div>

      {/* IPC Letter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">IPC Notification Letter</h2>
        <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto border border-gray-200">
          {ipcText}
        </pre>
      </div>
    </div>
  );
}
