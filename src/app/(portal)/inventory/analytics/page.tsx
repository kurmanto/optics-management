import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function recommendedAction(days: number | null): string {
  if (days === null) return "No sales data";
  if (days < 180) return "Monitor";
  if (days < 270) return "10% off";
  if (days < 365) return "25% off";
  if (days < 545) return "40% off";
  return "Discontinue";
}

export default async function InventoryAnalyticsPage() {
  await verifySession();

  const [items, orderRevenue] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: { vendor: { select: { name: true } } },
      orderBy: { brand: "asc" },
    }),
    prisma.orderLineItem.groupBy({
      by: ["inventoryItemId"],
      where: { inventoryItemId: { not: null }, type: "FRAME" },
      _sum: { quantity: true, totalReal: true },
    }),
  ]);

  const revenueMap = new Map(
    orderRevenue
      .filter((r) => r.inventoryItemId)
      .map((r) => [
        r.inventoryItemId!,
        { units: r._sum.quantity || 0, revenue: r._sum.totalReal || 0 },
      ])
  );

  // Summary stats
  const totalValue = items.reduce((s, i) => s + i.stockQuantity * (i.retailPrice || 0), 0);
  const totalInvested = items.reduce((s, i) => s + i.stockQuantity * (i.landedCost || i.wholesaleCost || 0), 0);
  const totalOnOrder = items.reduce((s, i) => s + i.onOrderQty, 0);

  // Dead stock: items not sold in 180+ days
  const now = Date.now();
  const deadStock = items
    .filter((item) => {
      const refDate = item.lastSoldAt || item.firstReceivedAt;
      if (!refDate) {
        const ageDays = daysSince(item.createdAt);
        return (ageDays || 0) > 180;
      }
      const days = daysSince(refDate);
      return (days || 0) > 180;
    })
    .map((item) => {
      const refDate = item.lastSoldAt || item.firstReceivedAt || item.createdAt;
      const days = daysSince(refDate) || 0;
      const valueAtCost = item.stockQuantity * (item.landedCost || item.wholesaleCost || 0);
      return { item, days, valueAtCost };
    })
    .sort((a, b) => b.days - a.days);

  const deadStockValue = deadStock.reduce((s, d) => s + d.valueAtCost, 0);

  // Best sellers by units
  const bestByUnits = items
    .map((item) => ({ item, ...( revenueMap.get(item.id) || { units: item.totalUnitsSold, revenue: 0 }) }))
    .filter((x) => x.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);

  // Worst sellers: 0 sales, in stock 90+ days
  const worstSellers = items
    .filter((item) => {
      const hasNoSales = !revenueMap.has(item.id) && item.totalUnitsSold === 0;
      const ageInStock = daysSince(item.firstReceivedAt || item.createdAt) || 0;
      return hasNoSales && ageInStock >= 90 && item.stockQuantity > 0;
    })
    .map((item) => ({
      item,
      daysInStock: daysSince(item.firstReceivedAt || item.createdAt) || 0,
      valueAtCost: item.stockQuantity * (item.landedCost || item.wholesaleCost || 0),
    }))
    .sort((a, b) => b.daysInStock - a.daysInStock)
    .slice(0, 10);

  // ABC analysis
  const totalRevenue = Array.from(revenueMap.values()).reduce((s, r) => s + r.revenue, 0);
  const rankedItems = items
    .map((item) => ({
      item,
      revenue: revenueMap.get(item.id)?.revenue || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  let cumRevenue = 0;
  const abcItems = rankedItems.map((entry) => {
    cumRevenue += entry.revenue;
    const cumPct = totalRevenue > 0 ? (cumRevenue / totalRevenue) * 100 : 100;
    const revenuePct = totalRevenue > 0 ? (entry.revenue / totalRevenue) * 100 : 0;
    const computed = cumPct - (entry.revenue / totalRevenue) * 100 <= 80
      ? "A"
      : cumPct - (entry.revenue / totalRevenue) * 100 <= 95
      ? "B"
      : "C";
    const abc = entry.revenue === 0 ? "C" : computed;
    return { ...entry, revenuePct, cumPct, abc };
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Performance insights, aging analysis, and ABC classification</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total SKUs", value: items.length.toLocaleString(), color: "border-gray-300" },
          { label: "Stock Value (Retail)", value: formatCurrency(totalValue), color: "border-primary/40" },
          { label: "Invested (Cost)", value: formatCurrency(totalInvested), color: "border-blue-300" },
          { label: "Units On Order", value: totalOnOrder.toLocaleString(), color: "border-yellow-300" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 border-l-4 ${stat.color}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Dead Stock */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Dead Stock & Aging Report</h2>
              <p className="text-sm text-gray-500 mt-0.5">Items with no sales in 6+ months</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Dead Stock Value</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(deadStockValue)}</p>
            </div>
          </div>
        </div>
        {deadStock.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            No dead stock — great inventory health!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frame</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Vendor</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Days Idle</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Value at Cost</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deadStock.slice(0, 25).map(({ item, days, valueAtCost }) => {
                  const action = recommendedAction(days);
                  const actionColor = action === "Discontinue" ? "text-red-600 bg-red-50"
                    : action === "40% off" ? "text-orange-700 bg-orange-50"
                    : action === "25% off" ? "text-yellow-700 bg-yellow-50"
                    : "text-gray-600 bg-gray-100";
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3">
                        <Link href={`/inventory/${item.id}`} className="hover:text-primary">
                          <p className="font-medium text-gray-900">{item.brand} {item.model}</p>
                          {item.color && <p className="text-xs text-gray-400">{item.color}</p>}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-500 hidden md:table-cell text-xs">{item.vendor?.name || "—"}</td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">{item.stockQuantity}</td>
                      <td className="px-6 py-3 text-right text-gray-500 hidden lg:table-cell">{days}</td>
                      <td className="px-6 py-3 text-right text-gray-700 hidden lg:table-cell">{valueAtCost > 0 ? formatCurrency(valueAtCost) : "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor}`}>{action}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Best & Worst Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Best Sellers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Best Sellers</h2>
            <p className="text-xs text-gray-500 mt-0.5">Top 10 by units sold</p>
          </div>
          {bestByUnits.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No sales data yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frame</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bestByUnits.map(({ item, units, revenue }, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <Link href={`/inventory/${item.id}`} className="hover:text-primary">
                        <p className="font-medium text-gray-900 text-xs">{item.brand} {item.model}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">{units}</td>
                    <td className="px-5 py-3 text-right text-green-700 font-medium">{revenue > 0 ? formatCurrency(revenue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Worst Sellers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Worst Sellers</h2>
            <p className="text-xs text-gray-500 mt-0.5">Zero sales, 90+ days in stock</p>
          </div>
          {worstSellers.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No slow movers found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frame</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Days</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {worstSellers.map(({ item, daysInStock, valueAtCost }) => {
                  const action = recommendedAction(daysInStock);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <Link href={`/inventory/${item.id}`} className="hover:text-primary">
                          <p className="font-medium text-gray-900 text-xs">{item.brand} {item.model}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500">{daysInStock}</td>
                      <td className="px-5 py-3 text-right text-gray-700 text-xs">{valueAtCost > 0 ? formatCurrency(valueAtCost) : "—"}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700">
                          {action}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ABC Analysis */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">ABC Analysis</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            A = top 80% of revenue · B = next 15% · C = bottom 5%
            {totalRevenue > 0 && ` · Total Revenue: ${formatCurrency(totalRevenue)}`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frame</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Revenue</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">% of Total</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Computed</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {abcItems.slice(0, 30).map(({ item, revenue, revenuePct, abc }) => {
                const abcColors: Record<string, string> = {
                  A: "bg-green-100 text-green-700",
                  B: "bg-blue-100 text-blue-700",
                  C: "bg-orange-100 text-orange-700",
                };
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <Link href={`/inventory/${item.id}`} className="hover:text-primary">
                        <p className="font-medium text-gray-900">{item.brand} {item.model}</p>
                        {item.color && <p className="text-xs text-gray-400">{item.color}</p>}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700 hidden md:table-cell">
                      {revenue > 0 ? formatCurrency(revenue) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-500 hidden lg:table-cell">
                      {revenue > 0 ? `${revenuePct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${abcColors[abc]}`}>
                        {abc}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {item.abcCategory ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${abcColors[item.abcCategory]}`}>
                          {item.abcCategory}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {abcItems.length > 30 && (
          <div className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
            Showing top 30 of {abcItems.length} items
          </div>
        )}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex gap-4">
              {["A", "B", "C"].map((cat) => {
                const count = abcItems.filter((x) => x.abc === cat).length;
                const rev = abcItems.filter((x) => x.abc === cat).reduce((s, x) => s + x.revenue, 0);
                const colors: Record<string, string> = { A: "text-green-700", B: "text-blue-700", C: "text-orange-700" };
                return (
                  <div key={cat} className="text-center">
                    <p className={`font-bold text-lg ${colors[cat]}`}>{cat}</p>
                    <p className="text-gray-500 text-xs">{count} items</p>
                    <p className="text-gray-500 text-xs">{formatCurrency(rev)}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-gray-400 text-xs ml-4">
              To apply computed categories to items, edit each item individually or use the bulk update from the detail page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
