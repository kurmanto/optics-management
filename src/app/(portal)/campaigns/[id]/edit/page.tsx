import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CampaignEditForm } from "@/components/campaigns/CampaignEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: Props) {
  await verifySession();
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href={`/campaigns/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to campaign
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
        <p className="text-sm text-gray-500 mt-0.5">{campaign.name}</p>
      </div>

      <CampaignEditForm campaign={campaign} />
    </div>
  );
}
