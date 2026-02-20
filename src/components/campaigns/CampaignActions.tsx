"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignStatus } from "@prisma/client";
import { Play, Pause, Archive, Zap, Trash2, ChevronDown } from "lucide-react";
import {
  activateCampaign,
  pauseCampaign,
  archiveCampaign,
  deleteCampaign,
  triggerCampaignRun,
} from "@/lib/actions/campaigns";
import { cn } from "@/lib/utils/cn";

interface Props {
  campaignId: string;
  currentStatus: CampaignStatus;
  isAdmin: boolean;
}

export function CampaignActions({ campaignId, currentStatus, isAdmin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handle(action: string) {
    setLoading(action);
    setOpen(false);
    try {
      let result: { success?: boolean; error?: string } | { id?: string; error?: string };
      if (action === "activate") result = await activateCampaign(campaignId);
      else if (action === "pause") result = await pauseCampaign(campaignId);
      else if (action === "archive") result = await archiveCampaign(campaignId);
      else if (action === "delete") {
        if (!confirm("Delete this campaign? This cannot be undone.")) {
          setLoading(null);
          return;
        }
        result = await deleteCampaign(campaignId);
        if (!("error" in result)) {
          router.push("/campaigns");
          return;
        }
      } else if (action === "trigger") {
        result = await triggerCampaignRun(campaignId);
        if (!("error" in result)) {
          alert("Campaign run triggered successfully!");
          router.refresh();
          setLoading(null);
          return;
        }
      } else {
        setLoading(null);
        return;
      }

      if ("error" in result && result.error) {
        alert(`Error: ${result.error}`);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        disabled={loading !== null}
      >
        Actions
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-20 overflow-hidden">
            {currentStatus !== "ACTIVE" && currentStatus !== "ARCHIVED" && (
              <button
                onClick={() => handle("activate")}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Play className="w-4 h-4 text-green-600" />
                Activate
              </button>
            )}
            {currentStatus === "ACTIVE" && (
              <button
                onClick={() => handle("pause")}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pause className="w-4 h-4 text-amber-600" />
                Pause
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handle("trigger")}
                disabled={loading === "trigger"}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-blue-600" />
                {loading === "trigger" ? "Running..." : "Trigger Run"}
              </button>
            )}
            {currentStatus !== "ARCHIVED" && (
              <button
                onClick={() => handle("archive")}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Archive className="w-4 h-4 text-gray-500" />
                Archive
              </button>
            )}
            <div className="border-t border-gray-100" />
            <button
              onClick={() => handle("delete")}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
