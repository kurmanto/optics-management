"use client";

import { useState } from "react";
import { completeFormSubmission } from "@/lib/actions/forms";
import { useRouter } from "next/navigation";

type InsurancePrefill = {
  providerName: string;
  policyNumber: string | null;
  groupNumber: string | null;
  memberId: string | null;
  coverageType: string;
};

type Props = {
  token: string;
  prefillName?: string | null;
  prefillInsurance?: InsurancePrefill | null;
  packageToken?: string;
  redirectUrl?: string;
};

export function InsuranceVerificationForm({ token, prefillName, prefillInsurance, packageToken, redirectUrl }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(fd.entries());

    let result: { error?: string };
    if (packageToken) {
      const { completeIntakeStep } = await import("@/lib/actions/forms");
      result = await completeIntakeStep(packageToken, token, data);
    } else {
      result = await completeFormSubmission(token, data);
    }

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push(redirectUrl ?? `/f/${token}/success`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {prefillInsurance && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700">
          We&apos;ve filled in your insurance details from our records — please verify everything is up to date.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Patient Information</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient Name <span className="text-red-500">*</span>
          </label>
          <input
            name="patientName"
            required
            defaultValue={prefillName ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relationship to Policy Holder
          </label>
          <select
            name="relationshipToHolder"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="SELF">Self (I am the policy holder)</option>
            <option value="SPOUSE">Spouse / Partner</option>
            <option value="DEPENDENT">Dependent (Child)</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Insurance Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Insurance Provider <span className="text-red-500">*</span>
          </label>
          <input
            name="insuranceProviderName"
            required
            defaultValue={prefillInsurance?.providerName ?? ""}
            placeholder="e.g. Sun Life, Green Shield, Manulife, OHIP"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Type</label>
          <select
            name="coverageType"
            defaultValue={prefillInsurance?.coverageType ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">— Select —</option>
            <option value="VISION">Vision Only</option>
            <option value="OHIP">OHIP</option>
            <option value="EXTENDED_HEALTH">Extended Health Benefits</option>
            <option value="COMBINED">Combined</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
            <input
              name="policyNumber"
              defaultValue={prefillInsurance?.policyNumber ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Number</label>
            <input
              name="groupNumber"
              defaultValue={prefillInsurance?.groupNumber ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
            <input
              name="memberId"
              defaultValue={prefillInsurance?.memberId ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Policy Holder Details</h2>
        <p className="text-sm text-gray-500">Fill in only if you are not the policy holder.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Holder Name</label>
            <input
              name="policyHolderName"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Holder Date of Birth</label>
            <input
              name="policyHolderDob"
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Renewal Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Month</label>
            <select
              name="renewalMonth"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">— Unknown —</option>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Year</label>
            <input
              name="renewalYear"
              type="number"
              min="2024"
              max="2030"
              placeholder={String(new Date().getFullYear())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Any additional details about your coverage"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>
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
        {submitting ? "Submitting…" : "Submit Insurance Information"}
      </button>
    </form>
  );
}
