"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Clock } from "lucide-react";
import { FormTemplateType } from "@prisma/client";

const TYPE_LABELS: Record<FormTemplateType, string> = {
  NEW_PATIENT: "New Patient",
  HIPAA_CONSENT: "Privacy Consent",
  FRAME_REPAIR_WAIVER: "Repair Waiver",
  INSURANCE_VERIFICATION: "Insurance",
  UNIFIED_INTAKE: "Intake",
};

type Props = {
  submission: {
    id: string;
    token: string;
    customerName: string | null;
    createdAt: Date;
    template: { type: FormTemplateType; name: string };
  };
  baseUrl: string;
};

export function OutstandingFormRow({ submission, baseUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `${baseUrl}/f/${submission.token}`;

  const daysAgo = Math.floor(
    (Date.now() - new Date(submission.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {submission.customerName ?? "Anonymous"}
          </p>
          <p className="text-xs text-gray-500">
            {TYPE_LABELS[submission.template.type]} ·{" "}
            {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <Link
          href={`/forms/${submission.id}`}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}
