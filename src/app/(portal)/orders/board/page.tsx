import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { KanbanBoard } from "@/components/orders/KanbanBoard";
import { Plus, List } from "lucide-react";
import { OrderStatus } from "@prisma/client";

export default async function OrderBoardPage() {
  await verifySession();

  const orders = await prisma.order.findMany({
    where: {
      status: {
        notIn: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalCustomer: true,
      balanceCustomer: true,
      dueDate: true,
      frameBrand: true,
      frameModel: true,
      createdAt: true,
      customer: { select: { firstName: true, lastName: true, marketingOptOut: true } },
    },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fulfillment Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} active {orders.length === 1 ? "order" : "orders"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/orders"
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <List className="w-4 h-4" />
            List View
          </Link>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>
      </div>

      <KanbanBoard orders={orders} />
    </div>
  );
}
