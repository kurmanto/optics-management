import { notFound } from "next/navigation";
import { getMemberProfile } from "@/lib/actions/client-portal";
import { MemberHeader } from "@/components/client/member/MemberHeader";
import { ExamTimeline } from "@/components/client/member/ExamTimeline";
import { CurrentRxCard } from "@/components/client/member/CurrentRxCard";
import { FrameHistory } from "@/components/client/member/FrameHistory";
import Link from "next/link";
import { ChevronLeft, Palette, Sparkles } from "lucide-react";
import type { StyleProfile } from "@/lib/utils/style-quiz";

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

      {/* Style profile section */}
      {(() => {
        const styleProfile = data.customer.styleProfile as StyleProfile | null;
        if (styleProfile) {
          return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Style ID
                </h3>
                <Link
                  href={`/my/style/${customerId}`}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  View Details
                </Link>
              </div>
              <p className="text-base font-bold text-gray-900">{styleProfile.label}</p>
            </div>
          );
        }
        return (
          <Link
            href={`/my/style/${customerId}`}
            className="block bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 shadow-sm p-4 hover:border-amber-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Palette className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Take the Style ID Quiz</p>
                <p className="text-xs text-gray-500">Discover frames matched to your personality</p>
              </div>
            </div>
          </Link>
        );
      })()}

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
