import { notFound } from "next/navigation";
import { getExamDetail } from "@/lib/actions/client-portal";
import { ExamSummaryCard } from "@/components/client/exam/ExamSummaryCard";
import { RxResultCard } from "@/components/client/exam/RxResultCard";
import { RxChangeIndicator } from "@/components/client/exam/RxChangeIndicator";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const data = await getExamDetail(examId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/my"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      <ExamSummaryCard
        examDate={data.exam.examDate}
        examType={data.exam.examType}
        doctorName={data.exam.doctorName}
        customerName={data.exam.customerName}
      />

      {data.currentRx && (
        <RxResultCard rx={data.currentRx} label="Prescription from this Exam" />
      )}

      {data.currentRx && data.previousRx && (
        <RxChangeIndicator previous={data.previousRx} current={data.currentRx} />
      )}

      {data.previousRx && (
        <RxResultCard rx={data.previousRx} label="Previous Prescription" />
      )}

      {!data.currentRx && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-sm text-gray-500">No prescription was recorded from this exam.</p>
        </div>
      )}
    </div>
  );
}
