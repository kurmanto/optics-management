"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  getMatchedFrames,
  getSavedFrameIds,
  toggleSaveFrameFromPortal,
} from "@/lib/actions/client-style";
import { Glasses, Heart } from "lucide-react";

interface MatchedFrame {
  id: string;
  brand: string;
  model: string;
  color: string | null;
  material: string | null;
  rimType: string | null;
  retailPrice: number | null;
  imageUrl: string | null;
  styleTags: string[];
}

interface MatchedFrameGridProps {
  customerId: string;
}

export function MatchedFrameGrid({ customerId }: MatchedFrameGridProps) {
  const [frames, setFrames] = useState<MatchedFrame[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMatchedFrames(customerId),
      getSavedFrameIds(customerId),
    ]).then(([matchedResult, savedResult]) => {
      setFrames(matchedResult as MatchedFrame[]);
      setSavedIds(new Set(savedResult));
      setLoading(false);
    });
  }, [customerId]);

  const handleToggleSave = useCallback(
    async (frameId: string) => {
      if (togglingId) return;
      setTogglingId(frameId);

      const wasSaved = savedIds.has(frameId);

      // Optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) {
          next.delete(frameId);
        } else {
          next.add(frameId);
        }
        return next;
      });

      const result = await toggleSaveFrameFromPortal(customerId, frameId);

      if ("error" in result) {
        // Revert on error
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) {
            next.add(frameId);
          } else {
            next.delete(frameId);
          }
          return next;
        });
      }

      setTogglingId(null);
    },
    [customerId, savedIds, togglingId]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
        <Glasses className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">
          No matching frames in stock right now — check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Frames Picked for You
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {frames.map((frame) => {
          const isSaved = savedIds.has(frame.id);
          return (
            <div
              key={frame.id}
              className="rounded-lg border border-gray-100 overflow-hidden"
            >
              <div className="aspect-square bg-gray-50 relative">
                {frame.imageUrl ? (
                  <Image
                    src={frame.imageUrl}
                    alt={`${frame.brand} ${frame.model}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Glasses className="h-10 w-10 text-gray-200" />
                  </div>
                )}
                <button
                  type="button"
                  disabled={togglingId !== null}
                  onClick={() => handleToggleSave(frame.id)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
                  aria-label={isSaved ? "Unsave frame" : "Save frame"}
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isSaved
                        ? "fill-red-500 text-red-500"
                        : "fill-none text-gray-400"
                    }`}
                  />
                </button>
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {frame.brand}
                </p>
                <p className="text-xs text-gray-500 truncate">{frame.model}</p>
                {frame.color && (
                  <p className="text-xs text-gray-400">{frame.color}</p>
                )}
                {frame.retailPrice && (
                  <p className="text-xs font-medium text-primary mt-0.5">
                    ${frame.retailPrice}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
