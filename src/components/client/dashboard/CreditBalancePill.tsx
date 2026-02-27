import { formatCurrency } from "@/lib/utils/formatters";
import { Wallet } from "lucide-react";

interface CreditBalancePillProps {
  total: number;
}

export function CreditBalancePill({ total }: CreditBalancePillProps) {
  if (total <= 0) return null;

  return (
    <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-gray-700">Store Credit</span>
      </div>
      <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
    </div>
  );
}
