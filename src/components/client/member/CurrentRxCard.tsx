import { RxTable } from "@/components/shared/RxTable";
import { formatDate } from "@/lib/utils/formatters";
import { FileText } from "lucide-react";
import type { RxData } from "@/components/shared/RxTable";

interface CurrentRxCardProps {
  rx: RxData & {
    date: Date;
    doctorName: string | null;
    expiryDate: Date | null;
    type: string;
  };
}

export function CurrentRxCard({ rx }: CurrentRxCardProps) {
  const isExpired = rx.expiryDate && new Date(rx.expiryDate) < new Date();
  const isExpiringSoon = rx.expiryDate && !isExpired &&
    new Date(rx.expiryDate).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">Current Prescription</h3>
        </div>
        {isExpired && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            Expired
          </span>
        )}
        {isExpiringSoon && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            Expiring Soon
          </span>
        )}
      </div>

      <RxTable rx={rx} />

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          {rx.doctorName ? `Dr. ${rx.doctorName}` : ""}
          {rx.doctorName && rx.date ? " · " : ""}
          {formatDate(rx.date)}
        </span>
        {rx.expiryDate && (
          <span>Expires {formatDate(rx.expiryDate)}</span>
        )}
      </div>
    </div>
  );
}
