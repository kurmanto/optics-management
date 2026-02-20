import { CampaignType } from "@prisma/client";
import { cn } from "@/lib/utils/cn";

const TYPE_LABELS: Record<CampaignType, string> = {
  WALKIN_FOLLOWUP: "Walk-in Follow-up",
  EXAM_REMINDER: "Exam Reminder",
  INSURANCE_RENEWAL: "Insurance Renewal",
  ONE_TIME_BLAST: "One-time Blast",
  SECOND_PAIR: "Second Pair",
  PRESCRIPTION_EXPIRY: "Rx Expiry",
  ABANDONMENT_RECOVERY: "Abandonment",
  FAMILY_ADDON: "Family Add-on",
  INSURANCE_MAXIMIZATION: "Insurance Max",
  POST_PURCHASE_REFERRAL: "Post-Purchase",
  VIP_INSIDER: "VIP Insider",
  DAMAGE_REPLACEMENT: "Damage Replace",
  STYLE_EVOLUTION: "Style Evolution",
  BIRTHDAY_ANNIVERSARY: "Birthday",
  DORMANT_REACTIVATION: "Reactivation",
  COMPETITOR_SWITCHER: "Switcher",
  LIFESTYLE_MARKETING: "Lifestyle",
  AGING_INVENTORY: "Aging Inventory",
  NEW_ARRIVAL_VIP: "New Arrival VIP",
  EDUCATIONAL_NURTURE: "Educational",
  LENS_EDUCATION: "Lens Education",
};

const TYPE_COLORS: Partial<Record<CampaignType, string>> = {
  EXAM_REMINDER: "bg-blue-50 text-blue-700",
  WALKIN_FOLLOWUP: "bg-purple-50 text-purple-700",
  INSURANCE_RENEWAL: "bg-indigo-50 text-indigo-700",
  INSURANCE_MAXIMIZATION: "bg-indigo-50 text-indigo-700",
  ONE_TIME_BLAST: "bg-gray-100 text-gray-600",
  VIP_INSIDER: "bg-amber-50 text-amber-700",
  NEW_ARRIVAL_VIP: "bg-amber-50 text-amber-700",
  BIRTHDAY_ANNIVERSARY: "bg-pink-50 text-pink-700",
  DORMANT_REACTIVATION: "bg-orange-50 text-orange-700",
  POST_PURCHASE_REFERRAL: "bg-green-50 text-green-700",
};

export function CampaignTypeBadge({ type }: { type: CampaignType }) {
  const label = TYPE_LABELS[type] ?? type.replace(/_/g, " ");
  const color = TYPE_COLORS[type] ?? "bg-primary/10 text-primary";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        color
      )}
    >
      {label}
    </span>
  );
}
