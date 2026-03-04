"use client";

import { useState, useTransition } from "react";
import {
  createBlockedTime,
  deleteBlockedTime,
} from "@/lib/actions/appointment-settings";

type BlockedTime = {
  id: string;
  providerId: string | null;
  startAt: Date | string;
  endAt: Date | string;
  reason: string | null;
  isRecurring: boolean;
  provider: { id: string; name: string } | null;
};

type Provider = {
  id: string;
  name: string;
  isActive: boolean;
};

type Props = {
  blockedTimes: BlockedTime[];
  providers: Provider[];
};

export function BlockedTimeManager({ blockedTimes, providers }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeProviders = providers.filter((p) => p.isActive);

  function handleCreate(formData: FormData) {
    setError(null);
    const providerId = formData.get("providerId") as string;
    const data = {
      providerId: providerId || undefined,
      startAt: formData.get("startAt") as string,
      endAt: formData.get("endAt") as string,
      reason: (formData.get("reason") as string) || undefined,
      isRecurring: formData.get("isRecurring") === "on",
    };

    startTransition(async () => {
      const result = await createBlockedTime(data);
      if ("error" in result) {
        setError(result.error);
      } else {
        setShowForm(false);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBlockedTime(id);
    });
  }

  function formatDt(dt: Date | string) {
    const d = typeof dt === "string" ? new Date(dt) : dt;
    return d.toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Blocked Times</h2>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showForm ? "Cancel" : "+ Block Time"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {showForm && (
        <form
          action={handleCreate}
          className="border border-gray-200 rounded-lg p-4 mb-4 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provider (leave blank for clinic-wide)</label>
            <select name="providerId" className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">All Providers (Clinic-wide)</option>
              {activeProviders.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
              <input
                name="startAt"
                type="datetime-local"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
              <input
                name="endAt"
                type="datetime-local"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <input
              name="reason"
              maxLength={200}
              placeholder="e.g. Lunch, Vacation, Professional Development"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create Block"}
          </button>
        </form>
      )}

      <div className="divide-y">
        {blockedTimes.map((bt) => (
          <div key={bt.id} className="flex items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                {formatDt(bt.startAt)} &mdash; {formatDt(bt.endAt)}
              </p>
              <p className="text-xs text-gray-500">
                {bt.provider ? bt.provider.name : "Clinic-wide"}
                {bt.reason && ` · ${bt.reason}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(bt.id)}
              disabled={isPending}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        ))}
        {blockedTimes.length === 0 && (
          <p className="text-sm text-gray-400 py-3">No blocked times configured.</p>
        )}
      </div>
    </div>
  );
}
