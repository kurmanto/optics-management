"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyIntakePackage } from "@/lib/actions/forms";
import { CheckCircle2, Loader2 } from "lucide-react";

export function ApplyIntakeButton({ packageId, customerId }: { packageId: string; customerId?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setLoading(true);
    setError(null);
    const result = await applyIntakePackage(packageId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setDone(true);
      const cid = result.customerId ?? customerId;
      if (cid) {
        router.push(`/customers/${cid}`);
      } else {
        router.refresh();
      }
    }
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-green-700 font-medium">
        <CheckCircle2 className="w-4 h-4" />
        Applied successfully
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleApply}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {loading ? "Applying…" : "Apply All to Patient Record"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
