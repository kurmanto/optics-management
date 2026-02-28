import Link from "next/link";
import { formatDate } from "@/lib/utils/formatters";
import { Eye } from "lucide-react";

interface Exam {
  id: string;
  examDate: Date;
  examType: string;
  doctorName: string | null;
}

interface ExamTimelineProps {
  exams: Exam[];
}

const TYPE_LABELS: Record<string, string> = {
  COMPREHENSIVE: "Comprehensive Exam",
  CONTACT_LENS: "Contact Lens Exam",
  FOLLOW_UP: "Follow-up",
  PEDIATRIC: "Pediatric Exam",
};

export function ExamTimeline({ exams }: ExamTimelineProps) {
  if (exams.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Exam History</h3>
        <p className="text-sm text-gray-500">No exams on record.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Exam History</h3>
      <div className="relative pl-6 space-y-4">
        {/* Timeline line */}
        <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-200" />

        {exams.map((exam, i) => (
          <Link
            key={exam.id}
            href={`/my/exam/${exam.id}`}
            className="block relative hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
          >
            {/* Timeline dot */}
            <div className={`absolute left-[-16px] top-2 h-3 w-3 rounded-full border-2 ${
              i === 0 ? "bg-primary border-primary" : "bg-white border-gray-300"
            }`} />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {TYPE_LABELS[exam.examType] || exam.examType}
                </p>
                {exam.doctorName && (
                  <p className="text-xs text-gray-500">Dr. {exam.doctorName}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Eye className="h-3 w-3" />
                {formatDate(exam.examDate)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
