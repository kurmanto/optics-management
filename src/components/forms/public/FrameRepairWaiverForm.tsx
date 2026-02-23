"use client";

import { useState } from "react";
import { completeFormSubmission } from "@/lib/actions/forms";
import { useRouter } from "next/navigation";
import { SignaturePad } from "./SignaturePad";

type Props = {
  token: string;
  prefillName?: string | null;
};

export function FrameRepairWaiverForm({ token, prefillName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [sigError, setSigError] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSigError(false);

    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      patientName: fd.get("patientName"),
      frameDescription: fd.get("frameDescription"),
      repairDescription: fd.get("repairDescription"),
      acknowledgedRisk: fd.get("acknowledgedRisk") === "on",
    };

    if (!data.acknowledgedRisk) {
      setError("You must acknowledge the risk to proceed.");
      return;
    }

    if (!signature) {
      setSigError(true);
      setError("Please sign the waiver before submitting.");
      return;
    }

    setSubmitting(true);

    const result = await completeFormSubmission(token, data, signature);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push(`/f/${token}/success`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-base text-amber-800">
          <strong>Important Notice:</strong> Frame repair and adjustment involves some risk of
          damage. Please read this waiver carefully before proceeding.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Frame Repair Waiver</h2>
        <p className="text-base text-gray-600">
          I understand that eyeglass frames, particularly those that are aged, previously repaired,
          or made of certain materials, may break or be damaged during repair or adjustment attempts.
          Mint Vision Optique will take all reasonable precautions, but cannot be held responsible
          for breakage resulting from pre-existing conditions or the inherent fragility of the frames.
        </p>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">
            Patient Name <span className="text-red-500">*</span>
          </label>
          <input
            name="patientName"
            required
            defaultValue={prefillName ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">
            Frame Description <span className="text-red-500">*</span>
          </label>
          <input
            name="frameDescription"
            required
            placeholder="e.g. Ray-Ban black acetate, gold temples"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">
            Repair Requested <span className="text-red-500">*</span>
          </label>
          <textarea
            name="repairDescription"
            required
            rows={3}
            placeholder="Describe what repair or adjustment is needed"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              name="acknowledgedRisk"
              type="checkbox"
              required
              className="mt-0.5 accent-primary"
            />
            <span className="text-base text-gray-700">
              <span className="text-red-500">*</span> I understand and acknowledge the risk of
              damage described above, and authorize Mint Vision Optique to proceed with the repair.
            </span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Signature</h2>
        <p className="text-base text-gray-600">
          By signing below, you authorize the repair and acknowledge the risks described above.
        </p>
        <SignaturePad onChange={setSignature} error={sigError} />
        <p className="text-xs text-gray-400">
          Date: {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {submitting ? "Submitting…" : "Sign & Submit Waiver"}
      </button>
    </form>
  );
}
