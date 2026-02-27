import { cn } from "@/lib/utils/cn";
import { Lock, Sparkles, Gift, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

interface UnlockCardItemProps {
  title: string;
  description: string | null;
  status: string;
  value: number | null;
  valueType: string | null;
  progress: number | null;
  progressGoal: number | null;
  customerName: string | null;
  expiresAt: Date | null;
}

export function UnlockCardItem({
  title,
  description,
  status,
  value,
  valueType,
  progress,
  progressGoal,
  customerName,
  expiresAt,
}: UnlockCardItemProps) {
  const isLocked = status === "LOCKED";
  const isUnlocked = status === "UNLOCKED";
  const isClaimed = status === "CLAIMED";
  const isExpired = status === "EXPIRED";

  const hasProgress = progressGoal && progressGoal > 0;
  const progressPct = hasProgress ? Math.min(((progress ?? 0) / progressGoal) * 100, 100) : 0;

  const valueDisplay = value
    ? valueType === "PERCENT"
      ? `${value}% off`
      : valueType === "FREEBIE"
      ? "Free"
      : formatCurrency(value)
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        isLocked && "border-gray-200 bg-gray-50 opacity-70",
        isUnlocked && "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/20",
        isClaimed && "border-green-200 bg-green-50",
        isExpired && "border-gray-200 bg-gray-100 opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {isLocked && <Lock className="h-3.5 w-3.5 text-gray-400" />}
            {isUnlocked && <Sparkles className="h-3.5 w-3.5 text-primary" />}
            {isClaimed && <Gift className="h-3.5 w-3.5 text-green-600" />}
            {isExpired && <Clock className="h-3.5 w-3.5 text-gray-400" />}
            <h4 className="text-sm font-semibold text-gray-900 truncate">{title}</h4>
          </div>
          {description && (
            <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
          )}
          {customerName && (
            <p className="text-xs text-gray-400 mt-1">For {customerName}</p>
          )}
        </div>

        {valueDisplay && (
          <span
            className={cn(
              "text-sm font-bold shrink-0",
              isUnlocked ? "text-primary" : "text-gray-400"
            )}
          >
            {valueDisplay}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {hasProgress && isLocked && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{progress ?? 0} / {progressGoal}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Expiry notice */}
      {isUnlocked && expiresAt && (
        <p className="mt-2 text-xs text-amber-600">
          Expires {new Date(expiresAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
