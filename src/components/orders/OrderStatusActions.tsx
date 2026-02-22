"use client";

import { useState } from "react";
import { advanceOrderStatus } from "@/lib/actions/orders";
import { OrderStatus, OrderType } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PickupCompleteModal } from "./PickupCompleteModal";

type Props = {
  orderId: string;
  nextStatus: OrderStatus;
  nextLabel: string;
  currentStatus: OrderStatus;
  orderType?: OrderType;
  orderTotal?: number;
  customerMarketingOptOut?: boolean;
};

export function OrderStatusActions({
  orderId,
  nextStatus,
  nextLabel,
  orderType,
  orderTotal = 0,
  customerMarketingOptOut = false,
}: Props) {
  const [pending, setPending] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);

  async function handleAdvance() {
    if (nextStatus === OrderStatus.PICKED_UP) {
      setShowPickupModal(true);
      return;
    }

    setPending(true);
    try {
      await advanceOrderStatus(orderId, nextStatus);
      // Auto-open work order for printing when sending to lab (non-exam orders only)
      if (nextStatus === OrderStatus.LAB_ORDERED && orderType !== OrderType.EXAM_ONLY) {
        window.open(`/orders/${orderId}/work-order?autoprint=true`, "_blank");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={handleAdvance} loading={pending}>
        {nextLabel}
        <ChevronRight className="w-4 h-4" />
      </Button>

      {showPickupModal && (
        <PickupCompleteModal
          orderId={orderId}
          orderTotal={orderTotal}
          customerMarketingOptOut={customerMarketingOptOut}
          onClose={() => setShowPickupModal(false)}
          onSuccess={() => setShowPickupModal(false)}
        />
      )}
    </>
  );
}
