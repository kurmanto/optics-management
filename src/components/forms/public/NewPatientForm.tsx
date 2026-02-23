"use client";

import { useState } from "react";
import { completeFormSubmission } from "@/lib/actions/forms";
import { useRouter } from "next/navigation";
import { SignaturePad } from "./SignaturePad";
import type { ReturningPatientPrefill } from "@/lib/types/forms";

type Props = {
  token: string;
  prefillName?: string | null;
  prefillData?: ReturningPatientPrefill | null;
  packageToken?: string;
  redirectUrl?: string;
};

export function NewPatientForm({ token, prefillName, prefillData, packageToken, redirectUrl }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [sigError, setSigError] = useState(false);
  const [hearAboutUs, setHearAboutUs] = useState(prefillData?.hearAboutUs ?? "");

  const prefillFirst = prefillData?.firstName ?? (prefillName?.split(" ")[0] ?? "");
  const prefillLast = prefillData?.lastName ?? (prefillName?.split(" ").slice(1).join(" ") ?? "");

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
    const data: Record<string, unknown> = Object.fromEntries(fd.entries());

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
      {prefillData && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700">
          Welcome back, {prefillData.firstName}! We&apos;ve filled in your info — please review and update anything that&apos;s changed.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Personal Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              name="firstName"
              required
              defaultValue={prefillFirst}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              name="lastName"
              required
              defaultValue={prefillLast}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={prefillData?.email ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              type="tel"
              defaultValue={prefillData?.phone ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              name="dateOfBirth"
              type="date"
              defaultValue={prefillData?.dateOfBirth ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              name="gender"
              defaultValue={prefillData?.gender ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Prefer not to say</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Address</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input
            name="address"
            defaultValue={prefillData?.address ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              name="city"
              defaultValue={prefillData?.city ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select
              name="province"
              defaultValue={prefillData?.province ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">—</option>
              {["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
            <input
              name="postalCode"
              defaultValue={prefillData?.postalCode ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Additional Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
            <input
              name="emergencyContactName"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
            <input
              name="emergencyContactPhone"
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Card Number</label>
            <input
              name="healthCardNumber"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
            <input
              name="occupation"
              placeholder="e.g. Teacher, Nurse, Student…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us?</label>
            <select
              name="hearAboutUs"
              value={hearAboutUs}
              onChange={(e) => setHearAboutUs(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">—</option>
              <option value="GOOGLE">Google</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="WALK_BY">Walk-by / Noticed the store</option>
              <option value="REFERRAL">Friend / Family referral</option>
              <option value="RETURNING">Returning patient</option>
              <option value="DOCTOR_REFERRAL">Doctor referral</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          {hearAboutUs === "REFERRAL" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referred by (name)</label>
              <input
                name="referredByName"
                placeholder="e.g. Jane Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Signature</h2>
        <p className="text-sm text-gray-600">
          By signing below, you confirm that the information provided above is accurate and complete.
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
