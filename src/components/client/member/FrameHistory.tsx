import { Glasses } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";

interface Frame {
  id: string;
  frameBrand: string | null;
  frameModel: string | null;
  frameColor: string | null;
  pickedUpAt: Date | null;
}

interface FrameHistoryProps {
  frames: Frame[];
}

export function FrameHistory({ frames }: FrameHistoryProps) {
  if (frames.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Glasses className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Frame History</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {frames.map((frame) => (
          <div
            key={frame.id}
            className="rounded-lg border border-gray-100 p-3 space-y-1"
          >
            <p className="text-sm font-medium text-gray-900">
              {frame.frameBrand || "Unknown"}
            </p>
            {frame.frameModel && (
              <p className="text-xs text-gray-600">{frame.frameModel}</p>
            )}
            {frame.frameColor && (
              <p className="text-xs text-gray-500">{frame.frameColor}</p>
            )}
            {frame.pickedUpAt && (
              <p className="text-xs text-gray-400">{formatDate(frame.pickedUpAt)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
