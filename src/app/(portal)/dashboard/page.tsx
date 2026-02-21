import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { OrderStatus, OrderType } from "@prisma/client";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
  Package,
  BarChart3,
  ArrowRight,
  CalendarDays,
  Glasses,
  Bell,
} from "lucide-react";

// ─────────────────────────────────────────
// DATA FETCHING
// ─────────────────────────────────────────

async function getMonthScoreboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [revenueAgg, ordersThisMonth, goalSetting] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: monthStart },
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] },
      },
      _sum: { totalReal: true },
      _count: true,
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: monthStart },
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] },
      },
    }),
    prisma.systemSetting.findUnique({ where: { key: "monthly_revenue_goal" } }),
  ]);

  const revenueThisMonth = revenueAgg._sum.totalReal ?? 0;
  const transactionsThisMonth = ordersThisMonth;
  const avgTicket = transactionsThisMonth > 0 ? revenueThisMonth / transactionsThisMonth : 0;
  const monthlyGoal = goalSetting ? parseFloat(goalSetting.value) : 40000;
  const goalPct = monthlyGoal > 0 ? Math.min(100, (revenueThisMonth / monthlyGoal) * 100) : 0;

  return { revenueThisMonth, transactionsThisMonth, avgTicket, monthlyGoal, goalPct };
}

async function getOpportunities() {
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
  const d12m = new Date(now); d12m.setFullYear(d12m.getFullYear() - 1);
  const d24m = new Date(now); d24m.setFullYear(d24m.getFullYear() - 2);

  const [
    incompleteOrders,
    exams30,
    exams60,
    exams90,
    dueForRecall,
    clDropoffs,
  ] = await Promise.all([
    // Incomplete orders: deposit taken but not picked up
    prisma.order.findMany({
      where: {
        depositReal: { gt: 0 },
        status: { notIn: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED] },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalReal: true,
        balanceReal: true,
        createdAt: true,
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),

    // Exams without purchases — last 30 days
    prisma.exam.findMany({
      where: {
        examDate: { gte: d30 },
        customer: {
          orders: {
            none: {
              createdAt: { gte: d30 },
              status: { notIn: [OrderStatus.CANCELLED] },
            },
          },
        },
      },
      select: {
        id: true,
        examDate: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),

    // Exams without purchases — 31-60 days
    prisma.exam.findMany({
      where: {
        examDate: { gte: d60, lt: d30 },
        customer: {
          orders: {
            none: {
              createdAt: { gte: d60 },
              status: { notIn: [OrderStatus.CANCELLED] },
            },
          },
        },
      },
      select: { id: true },
    }),

    // Exams without purchases — 61-90 days
    prisma.exam.findMany({
      where: {
        examDate: { gte: d90, lt: d60 },
        customer: {
          orders: {
            none: {
              createdAt: { gte: d90 },
              status: { notIn: [OrderStatus.CANCELLED] },
            },
          },
        },
      },
      select: { id: true },
    }),

    // Due for recall: last exam was 12–24 months ago, active customers
    prisma.customer.findMany({
      where: {
        isActive: true,
        exams: {
          some: { examDate: { gte: d24m, lt: d12m } },
          none: { examDate: { gte: d12m } },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        exams: {
          orderBy: { examDate: "desc" },
          take: 1,
          select: { examDate: true },
        },
      },
      take: 10,
    }),

    // Contact lens drop-offs: last CL order 90+ days ago
    prisma.customer.findMany({
      where: {
        isActive: true,
        orders: {
          some: { type: OrderType.CONTACTS },
          none: {
            type: OrderType.CONTACTS,
            createdAt: { gte: d90 },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        orders: {
          where: { type: OrderType.CONTACTS },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, totalReal: true },
        },
      },
      take: 10,
    }),
  ]);

  return {
    incompleteOrders,
    examsWithoutPurchase: {
      last30: exams30.length,
      last60: exams60.length,
      last90: exams90.length,
      recent: exams30.slice(0, 5),
    },
    dueForRecall,
    clDropoffs,
  };
}

async function getConversionMetrics() {
  const d90 = new Date();
  d90.setDate(d90.getDate() - 90);

  const [examsIn90, ordersAfterExam, frameLineItems, glassesOrders] = await Promise.all([
    // Total exams in last 90 days
    prisma.exam.count({ where: { examDate: { gte: d90 } } }),

    // Orders placed within 30 days of an exam in same period
    prisma.order.count({
      where: {
        createdAt: { gte: d90 },
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] },
        customer: {
          exams: { some: { examDate: { gte: d90 } } },
        },
      },
    }),

    // Total FRAME line items in non-cancelled orders (all time)
    prisma.orderLineItem.count({
      where: {
        type: "FRAME",
        order: {
          status: { notIn: [OrderStatus.CANCELLED] },
          type: { in: [OrderType.GLASSES, OrderType.SUNGLASSES] },
        },
      },
    }),

    // Total glasses/sunglasses orders (non-cancelled)
    prisma.order.count({
      where: {
        status: { notIn: [OrderStatus.CANCELLED] },
        type: { in: [OrderType.GLASSES, OrderType.SUNGLASSES] },
      },
    }),
  ]);

  const examConversionPct = examsIn90 > 0 ? (ordersAfterExam / examsIn90) * 100 : null;
  const avgFramesPerTx = glassesOrders > 0 ? frameLineItems / glassesOrders : null;

  return { examsIn90, ordersAfterExam, examConversionPct, avgFramesPerTx, glassesOrders };
}

async function getAdminMetrics() {
  const now = new Date();

  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  // This year
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  // Last year same period
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59);

  const [
    thisMonthAgg,
    lastMonthAgg,
    thisYearAgg,
    lastYearAgg,
    revenueByType,
    recentPickups,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: thisMonthStart }, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] } },
      _sum: { totalReal: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] } },
      _sum: { totalReal: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: thisYearStart }, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] } },
      _sum: { totalReal: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: lastYearStart, lte: lastYearEnd }, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] } },
      _sum: { totalReal: true },
    }),
    // Revenue by order type (this year)
    prisma.order.groupBy({
      by: ["type"],
      where: { createdAt: { gte: thisYearStart }, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] } },
      _sum: { totalReal: true },
      _count: true,
    }),
    // Review velocity: avg time from CONFIRMED to PICKED_UP (last 30 completed orders)
    prisma.order.findMany({
      where: {
        status: OrderStatus.PICKED_UP,
        pickedUpAt: { not: null },
        updatedAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true, pickedUpAt: true },
      orderBy: { pickedUpAt: "desc" },
      take: 30,
    }),
  ]);

  const thisMonthRev = thisMonthAgg._sum.totalReal ?? 0;
  const lastMonthRev = lastMonthAgg._sum.totalReal ?? 0;
  const momGrowth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : null;

  const thisYearRev = thisYearAgg._sum.totalReal ?? 0;
  const lastYearRev = lastYearAgg._sum.totalReal ?? 0;
  const yoyGrowth = lastYearRev > 0 ? ((thisYearRev - lastYearRev) / lastYearRev) * 100 : null;

  // Avg days from creation to pickup
  const completedWithDates = recentPickups.filter(o => o.pickedUpAt);
  const avgFulfillmentDays = completedWithDates.length > 0
    ? completedWithDates.reduce((sum, o) => {
        const days = (o.pickedUpAt!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / completedWithDates.length
    : null;

  return {
    thisMonthRev,
    lastMonthRev,
    momGrowth,
    thisYearRev,
    lastYearRev,
    yoyGrowth,
    revenueByType,
    avgFulfillmentDays,
    thisMonthOrders: thisMonthAgg._count,
    lastMonthOrders: lastMonthAgg._count,
  };
}

async function getRecentOrders() {
  return prisma.order.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { firstName: true, lastName: true } },
    },
  });
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  LAB_ORDERED: "Lab Ordered",
  LAB_RECEIVED: "Lab Received",
  VERIFIED: "Verified",
  READY: "Ready",
  PICKED_UP: "Picked Up",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "bg-[#F5F5F5] text-[#595959]",
  CONFIRMED: "bg-blue-50 text-blue-700",
  LAB_ORDERED: "bg-orange-50 text-orange-700",
  LAB_RECEIVED: "bg-yellow-50 text-yellow-700",
  VERIFIED: "bg-indigo-50 text-indigo-700",
  READY: "bg-[#F0FDF4] text-[#059669]",
  PICKED_UP: "bg-[#F5F5F5] text-[#595959]",
  CANCELLED: "bg-red-50 text-[#DC2626]",
};

const TYPE_LABELS: Record<OrderType, string> = {
  GLASSES: "Glasses",
  CONTACTS: "Contacts",
  SUNGLASSES: "Sunglasses",
  ACCESSORIES: "Accessories",
  EXAM_ONLY: "Exam Only",
};

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[#808080] text-sm">—</span>;
  const pos = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${pos ? "text-[#059669]" : "text-[#DC2626]"}`}>
      {pos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {pos ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────

async function getFollowUps() {
  const now = new Date();
  const in14d = new Date(now); in14d.setDate(in14d.getDate() + 14);

  const [pendingReturnFrames, upcomingStylingAppts] = await Promise.all([
    // Saved frames with expected return date in next 14 days or overdue
    prisma.savedFrame.findMany({
      where: {
        expectedReturnDate: { not: null, lte: in14d },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { expectedReturnDate: "asc" },
      take: 10,
    }),
    // Upcoming styling appointments in next 7 days
    prisma.appointment.findMany({
      where: {
        type: "STYLING",
        scheduledAt: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        status: { not: "CANCELLED" },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
  ]);

  return { pendingReturnFrames, upcomingStylingAppts };
}

export default async function DashboardPage() {
  const session = await verifySession();
  const isAdmin = session.role === "ADMIN";

  const [scoreboard, opportunities, conversion, recentOrders, adminMetrics, followUps] = await Promise.all([
    getMonthScoreboard(),
    getOpportunities(),
    getConversionMetrics(),
    getRecentOrders(),
    isAdmin ? getAdminMetrics() : Promise.resolve(null),
    getFollowUps(),
  ]);

  const totalOpportunities =
    opportunities.incompleteOrders.length +
    opportunities.examsWithoutPurchase.last30 +
    opportunities.dueForRecall.length +
    opportunities.clDropoffs.length;

  return (
    <div className="p-6 space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-[32px] font-bold text-gray-900 leading-tight">Dashboard</h1>
        <p className="text-sm text-[#808080] mt-1">
          {new Date().toLocaleDateString("en-CA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ── TODAY'S SCOREBOARD ── */}
      <section className="bg-[#E8E8E8] border border-[#D8D8D8] rounded-lg p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#808080] mb-5">
          This Month
        </h2>
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-[#808080] mb-1">Revenue</p>
            <p className="text-[48px] font-bold leading-none tabular-nums text-gray-900">
              {formatCurrency(scoreboard.revenueThisMonth)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#808080] mb-1">Avg Ticket</p>
            <p className="text-[48px] font-bold leading-none tabular-nums text-gray-900">
              {scoreboard.transactionsThisMonth > 0
                ? formatCurrency(scoreboard.avgTicket)
                : <span className="text-[#C0C0C0]">—</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#808080] mb-1">Orders</p>
            <p className="text-[48px] font-bold leading-none tabular-nums text-gray-900">
              {scoreboard.transactionsThisMonth}
            </p>
          </div>
        </div>

        {/* Goal progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#808080]">Monthly Goal</span>
            <span className="text-gray-900 font-medium">
              {formatCurrency(scoreboard.revenueThisMonth)} / {formatCurrency(scoreboard.monthlyGoal)}
            </span>
          </div>
          <div className="h-1.5 bg-[#D0D0D0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#059669] rounded-full transition-all duration-700"
              style={{ width: `${scoreboard.goalPct}%` }}
            />
          </div>
          <p className="text-xs text-[#808080] mt-1.5">
            {scoreboard.goalPct >= 100
              ? "Goal reached!"
              : `${scoreboard.goalPct.toFixed(0)}% of monthly goal`}
          </p>
        </div>
      </section>

      {/* ── MONEY ON THE TABLE ── */}
      {totalOpportunities > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-900">Money on the Table</h2>
            <span className="text-xs font-semibold bg-black text-white px-2 py-0.5 rounded">
              {totalOpportunities}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Incomplete Orders */}
            {opportunities.incompleteOrders.length > 0 && (
              <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#808080]" />
                    <h3 className="text-sm font-semibold text-gray-900">Deposit Taken — Not Picked Up</h3>
                  </div>
                  <span className="text-xs text-[#808080] font-medium">
                    {opportunities.incompleteOrders.length}
                  </span>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {opportunities.incompleteOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {o.customer.firstName} {o.customer.lastName}
                        </p>
                        <p className="text-xs text-[#808080]">{o.orderNumber} · {formatDate(o.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                        <p className="text-xs text-[#808080] mt-1">
                          {formatCurrency(o.balanceReal)} remaining
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Exams Without Purchases */}
            {(opportunities.examsWithoutPurchase.last30 + opportunities.examsWithoutPurchase.last60 + opportunities.examsWithoutPurchase.last90) > 0 && (
              <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#808080]" />
                    <h3 className="text-sm font-semibold text-gray-900">Exams Without Purchase</h3>
                  </div>
                </div>
                <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-[#F5F5F5]">
                  {[
                    { label: "30 days", count: opportunities.examsWithoutPurchase.last30 },
                    { label: "31–60 days", count: opportunities.examsWithoutPurchase.last60 },
                    { label: "61–90 days", count: opportunities.examsWithoutPurchase.last90 },
                  ].map(({ label, count }) => (
                    <div key={label} className="text-center bg-[#F9F9F9] rounded-lg py-3">
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-[#808080] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {opportunities.examsWithoutPurchase.recent.length > 0 && (
                  <div className="divide-y divide-[#F5F5F5]">
                    {opportunities.examsWithoutPurchase.recent.map((exam) => (
                      <Link
                        key={exam.id}
                        href={`/customers/${exam.customer.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {exam.customer.firstName} {exam.customer.lastName}
                        </p>
                        <p className="text-xs text-[#808080]">{formatDate(exam.examDate)}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Due for Recall */}
            {opportunities.dueForRecall.length > 0 && (
              <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#808080]" />
                    <h3 className="text-sm font-semibold text-gray-900">Due for Recall</h3>
                  </div>
                  <span className="text-xs text-[#808080] font-medium">
                    Last exam 1–2 years ago
                  </span>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {opportunities.dueForRecall.map((c) => (
                    <Link
                      key={c.id}
                      href={`/customers/${c.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-[#808080]">
                        Last exam: {c.exams[0] ? formatDate(c.exams[0].examDate) : "—"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Lens Drop-offs */}
            {opportunities.clDropoffs.length > 0 && (
              <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#808080]" />
                    <h3 className="text-sm font-semibold text-gray-900">Contact Lens Drop-offs</h3>
                  </div>
                  <span className="text-xs text-[#808080] font-medium">
                    Last order 90+ days ago
                  </span>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {opportunities.clDropoffs.map((c) => (
                    <Link
                      key={c.id}
                      href={`/customers/${c.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-[#808080]">
                        Last order: {c.orders[0] ? formatDate(c.orders[0].createdAt) : "—"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── CONVERSION METRICS ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Conversion Metrics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-[#808080]" />
              <p className="text-sm text-[#808080] font-medium">Exam → Purchase Rate</p>
            </div>
            <p className="text-[40px] font-bold leading-none tabular-nums">
              {conversion.examConversionPct !== null
                ? `${conversion.examConversionPct.toFixed(0)}%`
                : "—"}
            </p>
            <p className="text-xs text-[#808080] mt-2">
              {conversion.ordersAfterExam} orders from {conversion.examsIn90} exams (last 90 days)
            </p>
            {conversion.examConversionPct !== null && conversion.examConversionPct < 70 && (
              <p className="text-xs text-[#DC2626] mt-1 font-medium">Below 70% target</p>
            )}
          </div>

          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-[#808080]" />
              <p className="text-sm text-[#808080] font-medium">Avg Frames per Transaction</p>
            </div>
            <p className="text-[40px] font-bold leading-none tabular-nums">
              {conversion.avgFramesPerTx !== null
                ? conversion.avgFramesPerTx.toFixed(2)
                : "—"}
            </p>
            <p className="text-xs text-[#808080] mt-2">
              Across {conversion.glassesOrders} glasses / sunglasses orders
            </p>
            <div className="flex items-center gap-1 mt-1">
              {conversion.avgFramesPerTx !== null && (
                conversion.avgFramesPerTx >= 1.3
                  ? <p className="text-xs text-[#059669] font-medium">At or above 1.3 goal</p>
                  : <p className="text-xs text-[#DC2626] font-medium">Below 1.3 goal</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── ADMIN: OWNER / MANAGER DASHBOARD ── */}
      {isAdmin && adminMetrics && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-900">Owner / Manager View</h2>
            <span className="text-xs font-medium bg-[#F5F5F5] text-[#595959] px-2 py-0.5 rounded">
              Admin only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Growth Metrics */}
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[#808080]" />
                <h3 className="text-sm font-semibold text-gray-900">Revenue Growth</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#808080] mb-0.5">Month over Month</p>
                  <p className="text-2xl font-bold tabular-nums">{formatCurrency(adminMetrics.thisMonthRev)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <GrowthBadge pct={adminMetrics.momGrowth} />
                    <span className="text-xs text-[#808080]">vs {formatCurrency(adminMetrics.lastMonthRev)}</span>
                  </div>
                </div>
                <div className="border-t border-[#F5F5F5] pt-4">
                  <p className="text-xs text-[#808080] mb-0.5">Year over Year (YTD)</p>
                  <p className="text-2xl font-bold tabular-nums">{formatCurrency(adminMetrics.thisYearRev)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <GrowthBadge pct={adminMetrics.yoyGrowth} />
                    <span className="text-xs text-[#808080]">vs {formatCurrency(adminMetrics.lastYearRev)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue by Category */}
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-[#808080]" />
                <h3 className="text-sm font-semibold text-gray-900">Revenue by Category (YTD)</h3>
              </div>
              {adminMetrics.revenueByType.length === 0 ? (
                <p className="text-sm text-[#808080]">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {adminMetrics.revenueByType
                    .sort((a, b) => (b._sum.totalReal ?? 0) - (a._sum.totalReal ?? 0))
                    .map((row) => {
                      const total = adminMetrics.revenueByType.reduce((s, r) => s + (r._sum.totalReal ?? 0), 0);
                      const pct = total > 0 ? ((row._sum.totalReal ?? 0) / total) * 100 : 0;
                      return (
                        <div key={row.type}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-900">{TYPE_LABELS[row.type]}</span>
                            <span className="text-[#808080]">{formatCurrency(row._sum.totalReal ?? 0)}</span>
                          </div>
                          <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-black rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Review Velocity */}
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[#808080]" />
                <h3 className="text-sm font-semibold text-gray-900">Fulfillment Speed</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#808080] mb-1">Avg days: Order → Pickup</p>
                  <p className="text-[40px] font-bold leading-none tabular-nums">
                    {adminMetrics.avgFulfillmentDays !== null
                      ? adminMetrics.avgFulfillmentDays.toFixed(1)
                      : "—"}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">
                    Based on last 30 completed orders (90 days)
                  </p>
                </div>
                <div className="border-t border-[#F5F5F5] pt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#808080]">This month orders</p>
                    <p className="text-xl font-bold mt-0.5">{adminMetrics.thisMonthOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#808080]">Last month orders</p>
                    <p className="text-xl font-bold mt-0.5">{adminMetrics.lastMonthOrders}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ── FOLLOW UPS ── */}
      {(followUps.pendingReturnFrames.length > 0 || followUps.upcomingStylingAppts.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Follow Ups</h2>
            <span className="text-xs font-semibold bg-amber-500 text-white px-2 py-0.5 rounded">
              {followUps.pendingReturnFrames.length + followUps.upcomingStylingAppts.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Saved Frames Pending Return */}
            {followUps.pendingReturnFrames.length > 0 && (
              <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center gap-2">
                  <Glasses className="w-4 h-4 text-[#808080]" />
                  <h3 className="text-sm font-semibold text-gray-900">Saved Frames — Pending Return</h3>
                  <span className="ml-auto text-xs text-[#808080] font-medium">{followUps.pendingReturnFrames.length}</span>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {followUps.pendingReturnFrames.map((frame) => {
                    const isPastDue = frame.expectedReturnDate! < new Date();
                    return (
                      <Link
                        key={frame.id}
                        href={`/customers/${frame.customer.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {frame.customer.firstName} {frame.customer.lastName}
                          </p>
                          <p className="text-xs text-[#808080]">{frame.brand} {frame.model}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          isPastDue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {isPastDue ? "Overdue" : formatDate(frame.expectedReturnDate!)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Styling Appointments */}
            {followUps.upcomingStylingAppts.length > 0 && (
              <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#808080]" />
                  <h3 className="text-sm font-semibold text-gray-900">Styling Appointments (7 days)</h3>
                  <span className="ml-auto text-xs text-[#808080] font-medium">{followUps.upcomingStylingAppts.length}</span>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {followUps.upcomingStylingAppts.map((appt) => (
                    <Link
                      key={appt.id}
                      href={`/customers/${appt.customer.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {appt.customer.firstName} {appt.customer.lastName}
                        </p>
                        <p className="text-xs text-[#808080]">
                          {new Date(appt.scheduledAt).toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        {appt.duration ?? 30}min
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* ── RECENT ORDERS ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
          <Link
            href="/orders/board"
            className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:underline"
          >
            View board <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-lg divide-y divide-[#F5F5F5]">
          {recentOrders.length === 0 ? (
            <div className="px-6 py-10 text-center text-[#808080] text-sm">
              No orders yet. Create your first order to get started.
            </div>
          ) : (
            recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-[#F9F9F9] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p className="text-xs text-[#808080] mt-0.5">{order.orderNumber}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded font-medium ${STATUS_COLORS[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(order.totalCustomer)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
