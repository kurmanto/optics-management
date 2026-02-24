"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils/formatters";

type ScoreboardData = {
  revenue: number;
  transactions: number;
  avgTicket: number;
  goal?: number;
  goalPct?: number;
};

type Props = {
  monthly: ScoreboardData;
  yearly: ScoreboardData;
  allTime: ScoreboardData;
};

const VIEWS = ["month", "year", "alltime"] as const;
type View = (typeof VIEWS)[number];

const VIEW_LABELS: Record<View, string> = {
  month: "This Month",
  year: "Year to Date",
  alltime: "All Time",
};

export function ScoreboardCard({ monthly, yearly, allTime }: Props) {
  const [view, setView] = useState<View>("month");

  function cycle() {
    setView((prev) => VIEWS[(VIEWS.indexOf(prev) + 1) % VIEWS.length]);
  }

  const data = view === "month" ? monthly : view === "year" ? yearly : allTime;
  const showGoal = view !== "alltime" && data.goal && data.goalPct !== undefined;
  const goalLabel = view === "month" ? "Monthly Goal" : "Yearly Goal";

  return (
    <section
      className="bg-[#E8E8E8] border border-[#D8D8D8] rounded-lg p-6 cursor-pointer select-none transition-all hover:bg-[#E0E0E0]"
      onClick={cycle}
      title="Click to cycle: Monthly → Yearly → All Time"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#808080]">
          {VIEW_LABELS[view]}
        </h2>
        <div className="flex gap-1.5">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={(e) => { e.stopPropagation(); setView(v); }}
              className={`w-2 h-2 rounded-full transition-colors ${
                v === view ? "bg-[#059669]" : "bg-[#C0C0C0]"
              }`}
              aria-label={VIEW_LABELS[v]}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-sm text-[#808080] mb-1">Revenue</p>
          <p className="text-[48px] font-bold leading-none tabular-nums text-gray-900">
            {formatCurrency(data.revenue)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[#808080] mb-1">Avg Ticket</p>
          <p className="text-[48px] font-bold leading-none tabular-nums text-gray-900">
            {data.transactions > 0
              ? formatCurrency(data.avgTicket)
              : <span className="text-[#C0C0C0]">—</span>}
          </p>
        </div>
        <div>
          <p className="text-sm text-[#808080] mb-1">Orders</p>
          <p className="text-[48px] font-bold leading-none tabular-nums text-gray-900">
            {data.transactions}
          </p>
        </div>
      </div>

      {showGoal && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#808080]">{goalLabel}</span>
            <span className="text-gray-900 font-medium">
              {formatCurrency(data.revenue)} / {formatCurrency(data.goal!)}
            </span>
          </div>
          <div className="h-1.5 bg-[#D0D0D0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#059669] rounded-full transition-all duration-700"
              style={{ width: `${data.goalPct}%` }}
            />
          </div>
          <p className="text-xs text-[#808080] mt-1.5">
            {data.goalPct! >= 100
              ? "Goal reached!"
              : `${data.goalPct!.toFixed(0)}% of ${goalLabel.toLowerCase()}`}
          </p>
        </div>
      )}
    </section>
  );
}
