import { cn } from "@/lib/utils/cn";
import { Crown, Shield, Star } from "lucide-react";

const TIERS = [
  { name: "Bronze", icon: Shield, bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { name: "Silver", icon: Star, bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
  { name: "Gold", icon: Crown, bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
];

interface FamilyBannerProps {
  familyName: string;
  tierLevel: number;
  tierPoints: number;
}

export function FamilyBanner({ familyName, tierLevel, tierPoints }: FamilyBannerProps) {
  const tier = TIERS[tierLevel] || TIERS[0];
  const Icon = tier.icon;

  // Progress to next tier (simplified)
  const nextTierThreshold = tierLevel === 0 ? 500 : tierLevel === 1 ? 1500 : null;
  const progressPct = nextTierThreshold
    ? Math.min((tierPoints / nextTierThreshold) * 100, 100)
    : 100;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {/family$/i.test(familyName.trim()) ? familyName : `${familyName} Family`}
          </h2>
          <p className="text-xs text-gray-500">{tierPoints} vision points</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border",
            tier.bg, tier.text, tier.border
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {tier.name}
        </span>
      </div>

      {nextTierThreshold && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Progress to {TIERS[tierLevel + 1]?.name ?? "next"}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
