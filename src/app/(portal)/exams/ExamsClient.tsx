"use client";

import { useState, useEffect, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus, Eye } from "lucide-react";
import { getWeeklyExams, type WeeklyExamData } from "@/lib/actions/exams";
import { formatCurrency } from "@/lib/utils/formatters";
import { LogExamModal } from "@/components/exams/LogExamModal";
import Link from "next/link";

const EXAM_TYPE_LABELS: Record<string, string> = {
  COMPREHENSIVE: "Comprehensive",
  CONTACT_LENS: "Contact Lens",
  FOLLOW_UP: "Follow-Up",
  PEDIATRIC: "Pediatric",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  DEBIT: "Debit",
  CREDIT_VISA: "Visa",
  CREDIT_MASTERCARD: "MC",
  CREDIT_AMEX: "Amex",
  CHEQUE: "Cheque",
  E_TRANSFER: "e-Transfer",
  INSURANCE: "Insurance",
  OTHER: "Other",
  UNSPECIFIED: "Not set",
};

type Props = {
  initialWeekStart: string;
};

function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  return d;
}

function shiftWeek(dateStr: string, weeks: number): string {
  const d = getMonday(dateStr);
  d.setDate(d.getDate() + 7 * weeks);
  return d.toISOString().split("T")[0];
}

function formatWeekRange(dateStr: string): string {
  const start = getMonday(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-CA", opts)} – ${end.toLocaleDateString("en-CA", { ...opts, year: "numeric" })}`;
}

function isCurrentWeek(dateStr: string): boolean {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return monday.toISOString().split("T")[0] === dateStr;
}

export function ExamsClient({ initialWeekStart }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [data, setData] = useState<WeeklyExamData | null>(null);
  const [loading, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);

  function fetchWeek(ws: string) {
    startTransition(async () => {
      const result = await getWeeklyExams(ws);
      setData(result);
    });
  }

  useEffect(() => {
    fetchWeek(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  function handlePrev() {
    setWeekStart((w) => shiftWeek(w, -1));
  }
  function handleNext() {
    setWeekStart((w) => shiftWeek(w, 1));
  }
  function handleCurrent() {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    setWeekStart(monday.toISOString().split("T")[0]);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-sm text-gray-500 mt-0.5">Weekly exam tracking & payment breakdown</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          Log Exam
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center min-w-[200px]">
          <p className="text-sm font-semibold text-gray-900">{formatWeekRange(weekStart)}</p>
          {isCurrentWeek(weekStart) && (
            <p className="text-xs text-primary font-medium">Current Week</p>
          )}
        </div>
        <button
          onClick={handleNext}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isCurrentWeek(weekStart) && (
          <button
            onClick={handleCurrent}
            className="ml-2 text-xs text-primary font-medium hover:underline"
          >
            Today
          </button>
        )}
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Exams</p>
            <p className="text-3xl font-bold text-gray-900">{data.totals.count}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Billed</p>
            <p className="text-3xl font-bold text-gray-900">
              {data.totals.totalBilled > 0 ? formatCurrency(data.totals.totalBilled) : "—"}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Paid</p>
            <p className="text-3xl font-bold text-gray-900">
              {data.totals.totalPaid > 0 ? formatCurrency(data.totals.totalPaid) : "—"}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Breakdown</p>
            <div className="space-y-1 mt-1">
              {Object.entries(data.totals.byPaymentMethod)
                .sort((a, b) => b[1] - a[1])
                .map(([method, count]) => (
                  <div key={method} className="flex justify-between text-xs">
                    <span className="text-gray-600">{PAYMENT_LABELS[method] || method}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              {Object.keys(data.totals.byPaymentMethod).length === 0 && (
                <p className="text-xs text-gray-400">No exams</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exams table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : !data || data.exams.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No exams recorded for this week.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-3 text-primary text-sm font-medium hover:underline"
            >
              Log the first exam
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Billed</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/customers/${exam.customer.id}`}
                        className="font-medium text-gray-900 hover:text-primary"
                      >
                        {exam.customer.firstName} {exam.customer.lastName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(exam.examDate).toLocaleDateString("en-CA", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {EXAM_TYPE_LABELS[exam.examType] || exam.examType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {exam.doctorName || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {exam.paymentMethod ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          exam.paymentMethod === "INSURANCE"
                            ? "bg-green-50 text-green-700"
                            : exam.ohipCovered
                            ? "bg-purple-50 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {PAYMENT_LABELS[exam.paymentMethod] || exam.paymentMethod}
                          {exam.ohipCovered && " (OHIP)"}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700 font-medium">
                      {exam.amountBilled != null ? formatCurrency(exam.amountBilled) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700 font-medium">
                      {exam.amountPaid != null ? formatCurrency(exam.amountPaid) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LogExamModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); fetchWeek(weekStart); }}
      />
    </div>
  );
}
