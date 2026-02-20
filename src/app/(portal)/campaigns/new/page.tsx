import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";

export default async function NewCampaignPage() {
  await verifySession();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to campaigns
      </Link>

      <div className="flex items-center gap-3">
        <Megaphone className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Set up a new automated marketing campaign
          </p>
        </div>
      </div>

      <CampaignWizard />
    </div>
  );
}
