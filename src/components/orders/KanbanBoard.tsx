"use client";

import { useState } from "react";
import Link from "next/link";
import { advanceOrderStatus } from "@/lib/actions/orders";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { OrderStatus } from "@prisma/client";

type KanbanOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalCustomer: number;
  balanceCustomer: number;
  dueDate: Date | null;
  customer: { firstName: string; lastName: string };
  frameBrand: string | null;
  frameModel: string | null;
};

type Props = {
  orders: KanbanOrder[];
};

const COLUMNS: { status: OrderStatus; label: string; color: string; bg: string }[] = [
  { status: OrderStatus.DRAFT, label: "Draft", color: "text-gray-600", bg: "bg-gray-50" },
  { status: OrderStatus.CONFIRMED, label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50" },
  { status: OrderStatus.LAB_ORDERED, label: "Lab Ordered", color: "text-orange-600", bg: "bg-orange-50" },
  { status: OrderStatus.LAB_RECEIVED, label: "Lab Received", color: "text-yellow-600", bg: "bg-yellow-50" },
  { status: OrderStatus.READY, label: "Ready", color: "text-green-600", bg: "bg-green-50" },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  DRAFT: OrderStatus.CONFIRMED,
  CONFIRMED: OrderStatus.LAB_ORDERED,
  LAB_ORDERED: OrderStatus.LAB_RECEIVED,
  LAB_RECEIVED: OrderStatus.READY,
  READY: OrderStatus.PICKED_UP,
};

export function KanbanBoard({ orders: initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [advancing, setAdvancing] = useState<string | null>(null);

  async function handleAdvance(orderId: string, newStatus: OrderStatus) {
    setAdvancing(orderId);

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    try {
      await advanceOrderStatus(orderId, newStatus);
    } catch {
      // Revert on failure
      setOrders(initialOrders);
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.status);
        return (
          <div
            key={col.status}
            className="flex-shrink-0 w-72"
          >
            {/* Column Header */}
            <div className={`${col.bg} rounded-t-xl px-4 py-3 flex items-center justify-between`}>
              <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
              <span className={`text-xs ${col.color} font-medium bg-white rounded-md px-2 py-0.5`}>
                {colOrders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="bg-gray-100/50 rounded-b-xl min-h-24 p-2 space-y-2">
              {colOrders.map((order) => {
                const nextStatus = NEXT_STATUS[order.status];
                const isOverdue = order.dueDate && new Date(order.dueDate) < new Date();

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-lg shadow-sm border p-3 space-y-2 ${
                      isOverdue ? "border-red-200" : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      {isOverdue && (
                        <span className="text-xs text-red-500 font-medium">Overdue</span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.customer.lastName}, {order.customer.firstName}
                      </p>
                      {(order.frameBrand || order.frameModel) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[order.frameBrand, order.frameModel].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.totalCustomer)}
                        </p>
                        {order.balanceCustomer > 0 && (
                          <p className="text-xs text-gray-400">
                            Bal: {formatCurrency(order.balanceCustomer)}
                          </p>
                        )}
                      </div>
                      {order.dueDate && (
                        <p className={`text-xs ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                          Due {formatDate(order.dueDate)}
                        </p>
                      )}
                    </div>

                    {nextStatus && (
                      <button
                        onClick={() => handleAdvance(order.id, nextStatus)}
                        disabled={advancing === order.id}
                        className="w-full text-xs text-primary border border-primary rounded-md py-1.5 font-medium hover:bg-primary/5 disabled:opacity-50 transition-colors"
                      >
                        {advancing === order.id ? "..." : `→ ${COLUMNS.find((c) => c.status === nextStatus)?.label || "Next"}`}
                      </button>
                    )}
                  </div>
                );
              })}

              {colOrders.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-400">No orders</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
