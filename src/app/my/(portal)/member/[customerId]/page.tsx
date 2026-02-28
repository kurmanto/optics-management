import { notFound } from "next/navigation";
import { getMemberProfile } from "@/lib/actions/client-portal";
import { MemberHeader } from "@/components/client/member/MemberHeader";
import { ExamTimeline } from "@/components/client/member/ExamTimeline";
import { CurrentRxCard } from "@/components/client/member/CurrentRxCard";
import { FrameHistory } from "@/components/client/member/FrameHistory";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const data = await getMemberProfile(customerId);

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

      <MemberHeader
        firstName={data.customer.firstName}
        lastName={data.customer.lastName}
        dateOfBirth={data.customer.dateOfBirth}
      />

      {data.currentRx && <CurrentRxCard rx={data.currentRx} />}

      <ExamTimeline exams={data.exams} />

      <FrameHistory frames={data.frameHistory} />

      {/* Upcoming appointments */}
      {data.appointments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Upcoming Appointments</h3>
          <div className="space-y-2">
            {data.appointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-gray-700">{apt.type.replace(/_/g, " ")}</span>
                <span className="text-gray-500">
                  {new Date(apt.scheduledAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
