"use client";

import { useState } from "react";
import { completeFormSubmission } from "@/lib/actions/forms";
import { useRouter } from "next/navigation";
import { SignaturePad } from "./SignaturePad";

type Props = {
  token: string;
  prefillName?: string | null;
  packageToken?: string;
  redirectUrl?: string;
};

export function HipaaConsentForm({ token, prefillName, packageToken, redirectUrl }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [sigError, setSigError] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSigError(false);

    if (!signature) {
      setSigError(true);
      setError("Please sign the form before submitting.");
      return;
    }

    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      patientName: fd.get("patientName"),
      smsOptIn: fd.get("smsOptIn") === "on",
      emailOptIn: fd.get("emailOptIn") === "on",
      shareWithInsurance: fd.get("shareWithInsurance") === "on",
      acknowledgedPrivacyPolicy: fd.get("acknowledgedPrivacyPolicy") === "on",
    };

    if (!data.acknowledgedPrivacyPolicy) {
      setError("You must acknowledge the privacy policy to proceed.");
      setSubmitting(false);
      return;
    }

    let result: { error?: string };
    if (packageToken) {
      const { completeIntakeStep } = await import("@/lib/actions/forms");
      result = await completeIntakeStep(packageToken, token, data, signature);
    } else {
      result = await completeFormSubmission(token, data, signature);
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
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">PIPEDA Privacy Consent</h2>
        <p className="text-sm text-gray-600">
          Mint Vision Optique collects personal health information to provide optical services. We
          are committed to protecting your privacy in accordance with the Personal Information
          Protection and Electronic Documents Act (PIPEDA).
        </p>

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
          <p><strong>Your information may be used to:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Provide eye care services and optical products</li>
            <li>Process insurance claims on your behalf</li>
            <li>Send appointment reminders and health updates</li>
            <li>Maintain accurate health records</li>
          </ul>
        </div>

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
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Communication Preferences</h2>

        <label className="flex items-start gap-3 cursor-pointer">
          <input name="smsOptIn" type="checkbox" defaultChecked className="mt-0.5 accent-primary" />
          <span className="text-sm text-gray-700">
            I consent to receive appointment reminders and updates via SMS.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input name="emailOptIn" type="checkbox" defaultChecked className="mt-0.5 accent-primary" />
          <span className="text-sm text-gray-700">
            I consent to receive appointment reminders and updates via email.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input name="shareWithInsurance" type="checkbox" defaultChecked className="mt-0.5 accent-primary" />
          <span className="text-sm text-gray-700">
            I authorize Mint Vision Optique to share necessary information with my insurance
            provider for claims processing.
          </span>
        </label>

        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              name="acknowledgedPrivacyPolicy"
              type="checkbox"
              required
              className="mt-0.5 accent-primary"
            />
            <span className="text-sm text-gray-700">
              <span className="text-red-500">*</span> I have read and understand the privacy policy
              above and consent to the collection and use of my personal health information as
              described.
            </span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Signature</h2>
        <p className="text-sm text-gray-600">
          By signing below, you are providing your electronic signature and agreeing to this
          consent form.
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
        {submitting ? "Submitting…" : "Sign & Submit"}
      </button>
    </form>
  );
}
