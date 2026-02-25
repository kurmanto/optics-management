"use client";

import { useState, useTransition } from "react";
import { Star, X } from "lucide-react";
import { toggleGoogleReview } from "@/lib/actions/customers";
import { formatDate } from "@/lib/utils/formatters";

type Props = {
  customerId: string;
  given: boolean;
  date: Date | null;
  note: string | null;
};

export function GoogleReviewCard({ customerId, given, date, note }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleMark() {
    startTransition(async () => {
      await toggleGoogleReview(customerId, true, noteValue);
      setShowForm(false);
      setNoteValue("");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await toggleGoogleReview(customerId, false);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Star className={`w-4 h-4 ${given ? "text-yellow-500 fill-yellow-500" : "text-gray-400"}`} />
          Google Review
        </h2>
        {given && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Given
          </span>
        )}
      </div>

      {given ? (
        <div className="text-sm space-y-1">
          {date && <p className="text-gray-500">Marked on {formatDate(date)}</p>}
          {note && <p className="text-gray-600 italic">&quot;{note}&quot;</p>}
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700 mt-2 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Remove review status
          </button>
        </div>
      ) : (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-primary font-medium hover:underline"
            >
              Mark as given
            </button>
          ) : (
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="e.g. 5 stars, mentioned Dr. Smith..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMark}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Confirm"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setNoteValue(""); }}
                  className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
