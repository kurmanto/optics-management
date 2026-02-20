import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { BarChart2, Megaphone } from "lucide-react";
import { CampaignStatusBadge } from "@/components/campaigns/CampaignStatusBadge";
import { CampaignTypeBadge } from "@/components/campaigns/CampaignTypeBadge";
import { formatCurrency } from "@/lib/utils/formatters";

export default async function CampaignAnalyticsPage() {
  await verifySession();

  const [campaigns, totalMessages, thisMonthMessages] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { totalSent: "desc" },
      include: { _count: { select: { recipients: true } } },
    }),
    prisma.message.count(),
    prisma.message.count({
      where: {
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const totalDelivered = campaigns.reduce((s, c) => s + c.totalDelivered, 0);
  const totalSent = campaigns.reduce((s, c) => s + c.totalSent, 0);
  const totalConverted = campaigns.reduce((s, c) => s + c.totalConverted, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.totalRevenue, 0);
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const conversionRate =
    totalDelivered > 0 ? Math.round((totalConverted / totalDelivered) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Performance overview across all campaigns
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Active Campaigns
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activeCampaigns}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Messages This Month
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{thisMonthMessages}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Delivery Rate
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{deliveryRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Conversion Rate
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{conversionRate}%</p>
        </div>
      </div>

      {/* Revenue card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          Total Revenue Attributed
        </p>
        <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(totalRevenue)}</p>
        <p className="text-xs text-gray-400 mt-1">
          From {totalConverted} converted recipients across all campaigns
        </p>
      </div>

      {/* Per-campaign comparison */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Campaign Performance</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No campaigns to display</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Converted
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium text-gray-900 hover:text-primary transition-colors"
                    >
                      {campaign.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <CampaignTypeBadge type={campaign.type} />
                  </td>
                  <td className="px-4 py-3">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {campaign._count.recipients}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {campaign.totalSent}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {campaign.totalConverted}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-primary">
                    {formatCurrency(campaign.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
