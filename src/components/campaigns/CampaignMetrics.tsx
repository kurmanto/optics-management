import { formatCurrency } from "@/lib/utils/formatters";

interface Props {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
}

export function CampaignMetrics({
  totalSent,
  totalDelivered,
  totalOpened,
  totalClicked,
  totalConverted,
  totalRevenue,
}: Props) {
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const conversionRate = totalDelivered > 0 ? Math.round((totalConverted / totalDelivered) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sent</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{totalSent}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Delivered</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{totalDelivered}</p>
        <p className="text-xs text-gray-400 mt-0.5">{deliveryRate}% rate</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Opened</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{totalOpened}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Clicked</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{totalClicked}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Converted</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{totalConverted}</p>
        <p className="text-xs text-gray-400 mt-0.5">{conversionRate}% rate</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Revenue</p>
        <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalRevenue)}</p>
      </div>
    </div>
  );
}
