"use client";

import { useTransition, useState } from "react";
import { CheckCircle, Loader2, Send, ChevronDown } from "lucide-react";
import { issueInvoice, issueBothInvoices } from "@/lib/actions/invoices";
import { InvoiceType } from "@prisma/client";

type Props = {
  orderId: string;
  issuedAt: Date | null;
  isDualInvoice?: boolean;
  internalIssuedAt?: Date | null;
};

export function IssueInvoiceButton({ orderId, issuedAt, isDualInvoice = false, internalIssuedAt = null }: Props) {
  const [pending, startTransition] = useTransition();
  const [showDropdown, setShowDropdown] = useState(false);

  function handleIssue(type: InvoiceType = InvoiceType.CUSTOMER) {
    startTransition(async () => { await issueInvoice(orderId, type); });
    setShowDropdown(false);
  }

  function handleIssueBoth() {
    startTransition(async () => { await issueBothInvoices(orderId); });
    setShowDropdown(false);
  }

  if (!isDualInvoice) {
    if (issuedAt && !pending) {
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4" />
            Issued {new Date(issuedAt).toLocaleDateString("en-CA")}
          </div>
          <button
            onClick={() => handleIssue()}
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
        onClick={() => handleIssue()}
        disabled={pending}
        className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {pending ? "Issuing…" : "Issue Invoice"}
      </button>
    );
  }

  // Dual invoice mode
  const bothIssued = issuedAt && internalIssuedAt;

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {bothIssued ? (
          <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4" />
            Both issued
          </div>
        ) : issuedAt ? (
          <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Customer issued
          </div>
        ) : internalIssuedAt ? (
          <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Internal issued
          </div>
        ) : null}

        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={pending}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {pending ? "Issuing…" : "Issue Invoice"}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {showDropdown && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-48 overflow-hidden">
          <button
            onClick={() => handleIssue(InvoiceType.CUSTOMER)}
            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100"
          >
            <p className="font-medium text-gray-900">Issue Insurance Invoice</p>
            <p className="text-xs text-gray-400">Customer-facing amounts</p>
          </button>
          <button
            onClick={() => handleIssue(InvoiceType.INTERNAL)}
            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100"
          >
            <p className="font-medium text-gray-900">Issue Actual Invoice</p>
            <p className="text-xs text-gray-400">Internal/real amounts</p>
          </button>
          <button
            onClick={handleIssueBoth}
            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 font-medium text-primary"
          >
            Issue Both Invoices
          </button>
        </div>
      )}
    </div>
  );
}
