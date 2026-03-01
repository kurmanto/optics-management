import { getFamilyOverview } from "@/lib/actions/client-portal";
import { FamilyBanner } from "@/components/client/dashboard/FamilyBanner";
import { QuickActionsRow } from "@/components/client/dashboard/QuickActionsRow";
import { UpcomingExamCards } from "@/components/client/dashboard/UpcomingExamCards";
import { BenefitsCountdown } from "@/components/client/dashboard/BenefitsCountdown";
import { CreditBalancePill } from "@/components/client/dashboard/CreditBalancePill";
import { ActiveOrdersStrip } from "@/components/client/dashboard/ActiveOrdersStrip";
import { ReferralShareCard } from "@/components/client/dashboard/ReferralShareCard";
import Link from "next/link";
import { Palette } from "lucide-react";

export default async function FamilyOverviewPage() {
  const data = await getFamilyOverview();

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load your portal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FamilyBanner
        familyName={data.family.name}
        tierLevel={data.family.tierLevel}
        tierPoints={data.family.tierPointsTotal}
      />

      <QuickActionsRow firstMemberId={data.members[0]?.id} />

      {/* Members quick list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Family Members</h3>
        <div className="space-y-2">
          {data.members.map((member) => (
            <Link
              key={member.id}
              href={`/my/member/${member.id}`}
              className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {member.firstName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {member.firstName} {member.lastName}
                </p>
                {member.dateOfBirth && (
                  <p className="text-xs text-gray-500">
                    {new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear()} years old
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <UpcomingExamCards appointments={data.upcomingAppointments} />

      <CreditBalancePill total={data.totalCredit} />

      <ActiveOrdersStrip orders={data.activeOrders} />

      <BenefitsCountdown policies={data.insurancePolicies} />

      {/* Style ID */}
      <Link
        href="/my/style"
        className="block bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 shadow-sm p-4 hover:border-amber-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Palette className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Find Your Style</h3>
            <p className="text-xs text-gray-500">
              Take the Style ID quiz and discover frames picked for you
            </p>
          </div>
        </div>
      </Link>

      {/* Referral share card */}
      <ReferralShareCard />

      {/* Unlock summary */}
      {data.unlockSummary.total > 0 && (
        <Link
          href="/my/unlocks"
          className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Unlock Cards</h3>
              <p className="text-xs text-gray-500">
                {data.unlockSummary.unlocked} unlocked · {data.unlockSummary.locked} to go
              </p>
            </div>
            <div className="text-2xl font-bold text-primary">
              {data.unlockSummary.unlocked}/{data.unlockSummary.total}
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
