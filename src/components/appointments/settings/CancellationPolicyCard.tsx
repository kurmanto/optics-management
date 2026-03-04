"use client";

import { useState, useTransition } from "react";
import { updateAppointmentSettings } from "@/lib/actions/appointment-settings";

type Settings = {
  id: string;
  minCancelHours: number;
};

type Props = { settings: Settings };

const CANCEL_OPTIONS = [
  { value: 0, label: "No restriction" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "72 hours" },
];

export function CancellationPolicyCard({ settings }: Props) {
  const [value, setValue] = useState(settings.minCancelHours);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateAppointmentSettings({ minCancelHours: value });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Cancellation Policy</h2>
      <p className="text-sm text-gray-500 mb-3">
        Minimum notice required for clients to cancel or reschedule via the client portal. Staff can always override.
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex items-center gap-3">
        <select
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          {CANCEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">before appointment</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || value === settings.minCancelHours}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </div>
  );
}
