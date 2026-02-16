"use client";

import { useState } from "react";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";
import { autoPopulateFromSubmission } from "@/lib/actions/forms";

type Props = {
  submissionId: string;
};

export function AutoPopulateButton({ submissionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await autoPopulateFromSubmission(submissionId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
        <CheckCircle className="w-4 h-4" />
        Customer record updated
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading ? "Updating…" : "Auto-populate to PMS"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
