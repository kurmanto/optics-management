import { Coins } from "lucide-react";

interface PointsEntry {
  id: string;
  points: number;
  reason: string;
  createdAt: Date;
}

interface PointsHistoryListProps {
  entries: PointsEntry[];
}

export function PointsHistoryList({ entries }: PointsHistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
        <Coins className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No points earned yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Complete actions like booking appointments and picking up orders to earn points!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{entry.reason}</p>
            <p className="text-xs text-gray-400">
              {new Date(entry.createdAt).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <span className="text-sm font-semibold text-primary ml-3">
            +{entry.points}
          </span>
        </div>
      ))}
    </div>
  );
}
