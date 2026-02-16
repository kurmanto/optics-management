"use client";

import { useState } from "react";
import { advanceOrderStatus } from "@/lib/actions/orders";
import { OrderStatus } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
    <Button onClick={handleAdvance} loading={pending}>
      {nextLabel}
      <ChevronRight className="w-4 h-4" />
    </Button>
  );
}
