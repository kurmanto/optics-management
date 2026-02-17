"use client";

import { useTransition, useState } from "react";
import { updatePOStatus, cancelPO } from "@/lib/actions/purchase-orders";
import { PurchaseOrderStatus } from "@prisma/client";

type Props = {
  poId: string;
  status: PurchaseOrderStatus;
  canCancel: boolean;
};

export function POStatusButtons({ poId, status, canCancel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(newStatus: "SENT" | "CONFIRMED" | "CANCELLED") {
    setError(null);
    startTransition(async () => {
      const result = await updatePOStatus(poId, newStatus);
      if (result.error) setError(result.error);
    });
  }

  function handleCancel() {
    if (!confirm("Cancel this purchase order? On-order quantities will be reversed.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelPO(poId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-red-600 text-xs">{error}</p>
      )}
      <div className="flex items-center gap-2">
        {status === "DRAFT" && (
          <button
            onClick={() => handleStatus("SENT")}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 h-9 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Mark as Sent
          </button>
        )}
        {status === "SENT" && (
          <button
            onClick={() => handleStatus("CONFIRMED")}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 h-9 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Confirm Order
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="inline-flex items-center gap-2 border border-red-300 text-red-600 px-3 h-9 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Cancel PO
          </button>
        )}
      </div>
      {isPending && (
        <p className="text-xs text-gray-400">Updating...</p>
      )}
    </div>
  );
}
