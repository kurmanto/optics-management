import { Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";

interface ExamSummaryCardProps {
  examDate: Date;
  examType: string;
  doctorName: string | null;
  customerName: string;
}

const TYPE_LABELS: Record<string, string> = {
  COMPREHENSIVE: "Comprehensive Exam",
  CONTACT_LENS: "Contact Lens Exam",
  FOLLOW_UP: "Follow-up",
  PEDIATRIC: "Pediatric Exam",
};

export function ExamSummaryCard({ examDate, examType, doctorName, customerName }: ExamSummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">
        {TYPE_LABELS[examType] || examType}
      </h2>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <User className="h-4 w-4 text-gray-400" />
          <span>{customerName}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{formatDate(examDate)}</span>
        </div>
        {doctorName && (
          <p className="text-gray-600">Dr. {doctorName}</p>
        )}
      </div>
    </div>
  );
}
