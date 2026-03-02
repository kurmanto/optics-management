import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ExamDueResult } from "@/lib/utils/exam-due";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  OVERDUE: { bg: "bg-red-100", text: "text-red-700", label: "Overdue" },
  DUE_SOON: { bg: "bg-amber-100", text: "text-amber-700", label: "Due Soon" },
  OK: { bg: "bg-green-100", text: "text-green-700", label: "Up to Date" },
  NO_DATA: { bg: "bg-gray-100", text: "text-gray-500", label: "No Data" },
};

interface ExamDueCardsProps {
  examDueDates: ExamDueResult[];
}

export function ExamDueCards({ examDueDates }: ExamDueCardsProps) {
  if (examDueDates.length === 0) return null;

  const hasActionable = examDueDates.some(
    (d) => d.status === "OVERDUE" || d.status === "DUE_SOON"
  );

  if (!hasActionable) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="h-4.5 w-4.5 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Exam Check-Up</h3>
      </div>
      <div className="space-y-2">
        {examDueDates
          .filter((d) => d.status === "OVERDUE" || d.status === "DUE_SOON")
          .map((due) => {
            const style = STATUS_STYLES[due.status];
            return (
              <div
                key={due.customerId}
                className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{due.firstName}</p>
                  <p className="text-xs text-gray-500 truncate">{due.reason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      style.bg,
                      style.text
                    )}
                  >
                    {style.label}
                  </span>
                  <Link
                    href="/my/book"
                    className="text-xs font-medium text-primary hover:text-primary/80"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
