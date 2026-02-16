"use client";

import { useState } from "react";
import { advanceOrderStatus } from "@/lib/actions/orders";
import { OrderStatus } from "@prisma/client";
import { ChevronRight } from "lucide-react";

type Props = {
  orderId: string;
  nextStatus: OrderStatus;
  nextLabel: string;
  currentStatus: OrderStatus;
};

export function OrderStatusActions({ orderId, nextStatus, nextLabel }: Props) {
  const [pending, setPending] = useState(false);

  async function handleAdvance() {
    setPending(true);
    try {
      await advanceOrderStatus(orderId, nextStatus);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleAdvance}
      disabled={pending}
      className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
    >
      {pending ? "Updating..." : nextLabel}
      <ChevronRight className="w-4 h-4" />
    </button>
  );
}
