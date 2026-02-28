import { Package } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  frameBrand: string | null;
  frameModel: string | null;
  customer: { firstName: string };
}

interface ActiveOrdersStripProps {
  orders: ActiveOrder[];
}

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  LAB_ORDERED: { label: "At Lab", color: "bg-purple-100 text-purple-700" },
  LAB_RECEIVED: { label: "Received from Lab", color: "bg-indigo-100 text-indigo-700" },
  VERIFIED: { label: "Quality Checked", color: "bg-teal-100 text-teal-700" },
  READY: { label: "Ready for Pickup", color: "bg-green-100 text-green-700" },
};

export function ActiveOrdersStrip({ orders }: ActiveOrdersStripProps) {
  if (orders.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Active Orders</h3>
      </div>
      <div className="space-y-2">
        {orders.map((order) => {
          const statusInfo = STATUS_DISPLAY[order.status] || {
            label: order.status,
            color: "bg-gray-100 text-gray-600",
          };

          return (
            <div
              key={order.id}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.customer.firstName}
                  {order.frameBrand && ` · ${order.frameBrand}`}
                  {order.frameModel && ` ${order.frameModel}`}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                  statusInfo.color
                )}
              >
                {statusInfo.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
