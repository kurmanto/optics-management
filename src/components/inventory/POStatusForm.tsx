"use client";

import { useTransition } from "react";
import type { POFormState } from "@/lib/actions/purchase-orders";

type Props = {
  poId: string;
  status: string;
  action: (poId: string, status: "SENT" | "CONFIRMED" | "CANCELLED") => Promise<POFormState>;
};

export default function POStatusForm({ poId, status, action }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleAction(newStatus: "SENT" | "CONFIRMED" | "CANCELLED") {
    startTransition(async () => {
      const result = await action(poId, newStatus);
      if (result?.error) {
        alert(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <button onClick={() => handleAction("SENT")} disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isPending ? "Updating..." : "Mark as Sent"}
        </button>
      )}
      {status === "SENT" && (
        <button onClick={() => handleAction("CONFIRMED")} disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {isPending ? "Updating..." : "Mark as Confirmed"}
        </button>
      )}
      {(status === "DRAFT" || status === "SENT" || status === "CONFIRMED" || status === "PARTIAL") && (
        <button onClick={() => {
          if (window.confirm("Cancel this PO? This cannot be undone.")) handleAction("CANCELLED");
        }} disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50">
          {isPending ? "Cancelling..." : "Cancel PO"}
        </button>
      )}
    </div>
  );
}
