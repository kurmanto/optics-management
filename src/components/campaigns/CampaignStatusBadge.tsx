import { CampaignStatus } from "@prisma/client";
import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
  PAUSED: { label: "Paused", className: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  ARCHIVED: { label: "Archived", className: "bg-gray-100 text-gray-400" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
