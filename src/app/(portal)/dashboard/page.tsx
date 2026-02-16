import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils/formatters";
import { OrderStatus } from "@prisma/client";
import { ShoppingBag, Users, DollarSign, Clock } from "lucide-react";

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalCustomers,
    ordersToday,
    ordersReadyForPickup,
    pendingOrders,
    revenueToday,
  ] = await Promise.all([
    prisma.customer.count({ where: { isActive: true } }),
    prisma.order.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.order.count({ where: { status: OrderStatus.READY } }),
    prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.CONFIRMED, OrderStatus.LAB_ORDERED, OrderStatus.LAB_RECEIVED],
        },
      },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { totalReal: true },
    }),
  ]);

  return {
    totalCustomers,
    ordersToday,
    ordersReadyForPickup,
    pendingOrders,
    revenueToday: revenueToday._sum.totalReal ?? 0,
  };
}

async function getRecentOrders() {
  return prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { firstName: true, lastName: true } },
    },
  });
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  LAB_ORDERED: "Lab Ordered",
  LAB_RECEIVED: "Lab Received",
  READY: "Ready",
  PICKED_UP: "Picked Up",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  LAB_ORDERED: "bg-orange-100 text-orange-700",
  LAB_RECEIVED: "bg-yellow-100 text-yellow-700",
  READY: "bg-green-100 text-green-700",
  PICKED_UP: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
  const [stats, recentOrders] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(),
  ]);

  const kpis = [
    {
      title: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.revenueToday),
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Ready for Pickup",
      value: stats.ordersReadyForPickup.toString(),
      icon: ShoppingBag,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "In Progress",
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-CA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 font-medium">{kpi.title}</p>
                <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <a
            href="/orders"
            className="text-sm text-primary hover:underline font-medium"
          >
            View all
          </a>
        </div>
        <div className="divide-y divide-gray-50">
          {recentOrders.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              No orders yet. Create your first order to get started.
            </div>
          ) : (
            recentOrders.map((order) => (
              <a
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.orderNumber}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                      STATUS_COLORS[order.status]
                    }`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(order.totalCustomer)}
                  </span>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
