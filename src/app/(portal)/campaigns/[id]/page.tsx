import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Megaphone } from "lucide-react";
import { CampaignStatusBadge } from "@/components/campaigns/CampaignStatusBadge";
import { CampaignTypeBadge } from "@/components/campaigns/CampaignTypeBadge";
import { CampaignMetrics } from "@/components/campaigns/CampaignMetrics";
import { RecipientTable } from "@/components/campaigns/RecipientTable";
import { MessageLog } from "@/components/campaigns/MessageLog";
import { CampaignActions } from "@/components/campaigns/CampaignActions";
import { formatDate } from "@/lib/utils/formatters";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
  const session = await verifySession();
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      recipients: {
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        },
        orderBy: { enrolledAt: "desc" },
        take: 50,
      },
      messages: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      runs: { orderBy: { runAt: "desc" }, take: 5 },
      _count: { select: { recipients: true, messages: true } },
    },
  });

  if (!campaign) notFound();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <CampaignStatusBadge status={campaign.status} />
              <CampaignTypeBadge type={campaign.type} />
            </div>
            {campaign.description && (
              <p className="text-sm text-gray-500 mt-0.5">{campaign.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Created {formatDate(campaign.createdAt)}
              {campaign.lastRunAt && ` · Last run ${formatDate(campaign.lastRunAt)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/campaigns/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <CampaignActions
            campaignId={id}
            currentStatus={campaign.status}
            isAdmin={session.role === "ADMIN"}
          />
        </div>
      </div>

      {/* Metrics */}
      <CampaignMetrics
        totalSent={campaign.totalSent}
        totalDelivered={campaign.totalDelivered}
        totalOpened={campaign.totalOpened}
        totalClicked={campaign.totalClicked}
        totalConverted={campaign.totalConverted}
        totalRevenue={campaign.totalRevenue}
      />

      {/* Recent runs */}
      {campaign.runs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent Runs</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Run At</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Found</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Failed</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaign.runs.map((run) => (
                <tr key={run.id} className="text-sm">
                  <td className="px-4 py-2 text-gray-600">{formatDate(run.runAt)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{run.recipientsFound}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{run.messagesSent}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{run.messagesFailed}</td>
                  <td className="px-4 py-2 text-gray-500 truncate max-w-xs">{run.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recipients */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Recipients ({campaign._count.recipients})
          </h2>
        </div>
        <RecipientTable recipients={campaign.recipients} />
      </div>

      {/* Message Log */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Message Log ({campaign._count.messages})
          </h2>
        </div>
        <MessageLog messages={campaign.messages} />
      </div>
    </div>
  );
}
