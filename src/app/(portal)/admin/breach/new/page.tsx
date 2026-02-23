"use client";

import { useActionState } from "react";
import { createBreachReport } from "@/lib/actions/breach";
import Link from "next/link";
import { redirect } from "next/navigation";

const DATA_TYPE_OPTIONS = [
  { value: "PHI", label: "Protected Health Information (PHI)" },
  { value: "insurance", label: "Insurance information" },
  { value: "prescriptions", label: "Prescriptions" },
  { value: "contact", label: "Contact information" },
  { value: "financial", label: "Financial information" },
];

export default function NewBreachReportPage() {
  const [state, action, pending] = useActionState(
    async (prevState: { error?: string; id?: string }, formData: FormData) => {
      const result = await createBreachReport(prevState, formData);
      if (result.id) {
        redirect(`/admin/breach/${result.id}`);
      }
      return result;
    },
    {}
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/breach" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Breach Reports
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Report a Privacy Breach</h1>
        <p className="text-sm text-gray-500 mt-1">
          PHIPA requires reporting breaches affecting PHI to the IPC within 72 hours.
        </p>
      </div>

      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={action} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Breach Discovered *
          </label>
          <input
            type="date"
            name="discoveredAt"
            required
            max={new Date().toISOString().split("T")[0]}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description of Breach *
          </label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Describe what happened, how the breach occurred, and what information may have been affected..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Number of Individuals Affected *
          </label>
          <input
            type="number"
            name="affectedCount"
            required
            min={1}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Types of Information Involved *
          </label>
          <div className="space-y-2">
            {DATA_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" name="dataTypes" value={opt.value} className="rounded" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Containment Actions Taken *
          </label>
          <textarea
            name="containmentActions"
            required
            rows={4}
            placeholder="Describe the steps taken to contain the breach and prevent further unauthorized access..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Submitting..." : "Submit Breach Report"}
          </button>
          <Link
            href="/admin/breach"
            className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
