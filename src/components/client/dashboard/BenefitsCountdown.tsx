import { Shield } from "lucide-react";

interface InsurancePolicy {
  id: string;
  providerName: string;
  renewalMonth: number | null;
  renewalYear: number | null;
  eligibilityIntervalMonths: number;
  lastClaimDate: Date | null;
  customer: { firstName: string };
}

interface BenefitsCountdownProps {
  policies: InsurancePolicy[];
}

function getEligibilityInfo(policy: InsurancePolicy) {
  if (!policy.lastClaimDate) {
    return { eligible: true, label: "Eligible now" };
  }

  const nextEligible = new Date(policy.lastClaimDate);
  nextEligible.setMonth(nextEligible.getMonth() + policy.eligibilityIntervalMonths);

  const now = new Date();
  if (now >= nextEligible) {
    return { eligible: true, label: "Eligible now" };
  }

  const diffMs = nextEligible.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) {
    return { eligible: false, label: `${diffDays} days`, soon: true };
  }

  const diffMonths = Math.ceil(diffDays / 30);
  return { eligible: false, label: `${diffMonths} months` };
}

export function BenefitsCountdown({ policies }: BenefitsCountdownProps) {
  if (policies.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">Insurance Benefits</h3>
      </div>
      <div className="space-y-2">
        {policies.map((policy) => {
          const info = getEligibilityInfo(policy);
          return (
            <div
              key={policy.id}
              className="flex items-center justify-between py-1.5"
            >
              <div>
                <p className="text-sm text-gray-700">
                  {policy.customer.firstName} · {policy.providerName}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  info.eligible
                    ? "bg-green-100 text-green-700"
                    : info.soon
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {info.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
