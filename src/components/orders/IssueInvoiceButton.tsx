"use client";

import { useTransition } from "react";
import { CheckCircle, Loader2, Send } from "lucide-react";
import { issueInvoice } from "@/lib/actions/invoices";

type Props = {
  orderId: string;
  issuedAt: Date | null;
};

export function IssueInvoiceButton({ orderId, issuedAt }: Props) {
  const [pending, startTransition] = useTransition();

  function handleIssue() {
    startTransition(async () => {
      await issueInvoice(orderId);
    });
  }

  if (issuedAt && !pending) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4" />
          Issued {new Date(issuedAt).toLocaleDateString("en-CA")}
        </div>
        <button
          onClick={handleIssue}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          Re-issue
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleIssue}
      disabled={pending}
      className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Send className="w-4 h-4" />
      )}
      {pending ? "Issuing…" : "Issue Invoice"}
    </button>
  );
}
