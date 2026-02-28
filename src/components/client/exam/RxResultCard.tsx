import { RxTable } from "@/components/shared/RxTable";
import type { RxData } from "@/components/shared/RxTable";

interface RxResultCardProps {
  rx: RxData;
  label: string;
}

export function RxResultCard({ rx, label }: RxResultCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{label}</h3>
      <RxTable rx={rx} />
    </div>
  );
}
