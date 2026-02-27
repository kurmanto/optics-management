"use client";

import { formatRxValue } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import { ArrowRight } from "lucide-react";

interface RxValues {
  odSphere: number | null;
  odCylinder: number | null;
  odAxis: number | null;
  odAdd: number | null;
  osSphere: number | null;
  osCylinder: number | null;
  osAxis: number | null;
  osAdd: number | null;
}

interface RxChangeIndicatorProps {
  previous: RxValues;
  current: RxValues;
}

const FIELDS: { key: keyof RxValues; label: string; eye: string; format?: boolean }[] = [
  { key: "odSphere", label: "SPH", eye: "OD", format: true },
  { key: "odCylinder", label: "CYL", eye: "OD", format: true },
  { key: "odAxis", label: "AXIS", eye: "OD" },
  { key: "odAdd", label: "ADD", eye: "OD", format: true },
  { key: "osSphere", label: "SPH", eye: "OS", format: true },
  { key: "osCylinder", label: "CYL", eye: "OS", format: true },
  { key: "osAxis", label: "AXIS", eye: "OS" },
  { key: "osAdd", label: "ADD", eye: "OS", format: true },
];

export function RxChangeIndicator({ previous, current }: RxChangeIndicatorProps) {
  const changes = FIELDS.filter((f) => {
    const prev = previous[f.key];
    const curr = current[f.key];
    return prev !== curr && (prev !== null || curr !== null);
  });

  if (changes.length === 0) {
    return (
      <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
        <p className="text-sm text-green-700 font-medium">No significant changes</p>
        <p className="text-xs text-green-600 mt-1">Your prescription is stable.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">What Changed</h3>
      <div className="space-y-2">
        {changes.map((f) => {
          const prev = previous[f.key];
          const curr = current[f.key];
          const display = (v: number | null) =>
            f.format ? formatRxValue(v) : (v ?? "—").toString();

          return (
            <div
              key={f.key}
              className="flex items-center gap-2 text-sm py-1 border-b border-gray-50 last:border-0"
            >
              <span className="text-xs font-mono text-gray-500 w-8">{f.eye}</span>
              <span className="text-xs text-gray-400 w-10">{f.label}</span>
              <span className={cn("font-mono", prev !== null ? "text-gray-500" : "text-gray-300")}>
                {display(prev)}
              </span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="font-mono font-medium text-gray-900">{display(curr)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
