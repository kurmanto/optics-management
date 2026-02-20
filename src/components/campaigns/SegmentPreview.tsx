"use client";

import { useState, useEffect } from "react";
import { previewSegment } from "@/lib/actions/campaigns";
import { Users, RefreshCw } from "lucide-react";
import type { SegmentDefinition } from "@/lib/campaigns/segment-types";

interface Props {
  segmentConfig: SegmentDefinition;
}

export function SegmentPreview({ segmentConfig }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    sample: { id: string; firstName: string; lastName: string; phone: string | null; email: string | null }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await previewSegment(segmentConfig);
      if ("error" in res) {
        setError(res.error);
      } else {
        setResult(res);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {loading ? (
            <span className="text-sm text-gray-500">Calculating audience size...</span>
          ) : error ? (
            <span className="text-sm text-red-500">{error}</span>
          ) : result ? (
            <span className="text-sm font-medium text-gray-900">
              <strong>{result.count}</strong> customers match this segment
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {result && result.sample.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Sample matches
          </p>
          <div className="space-y-1.5">
            {result.sample.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {c.firstName} {c.lastName}
                </span>
                <span className="text-gray-400 text-xs">
                  {c.phone ?? c.email ?? "no contact"}
                </span>
              </div>
            ))}
          </div>
          {result.count > result.sample.length && (
            <p className="text-xs text-gray-400 mt-2">
              + {result.count - result.sample.length} more
            </p>
          )}
        </div>
      )}

      {result && result.count === 0 && (
        <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
          No customers currently match this segment. The campaign will automatically enroll
          customers as they meet the criteria.
        </div>
      )}

      <div className="text-xs text-gray-400">
        Segment rules: {segmentConfig.conditions.length > 0
          ? `${segmentConfig.conditions.length} condition${segmentConfig.conditions.length !== 1 ? "s" : ""} (${segmentConfig.logic})`
          : "All customers"}
        {segmentConfig.excludeMarketingOptOut && " · Excludes opted-out customers"}
        {segmentConfig.requireChannel && ` · Requires ${segmentConfig.requireChannel}`}
      </div>
    </div>
  );
}
