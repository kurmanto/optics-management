"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lookupReturningPatient, createUnifiedIntakeSubmission } from "@/lib/actions/forms";
import type { ReturningPatientPrefill } from "@/lib/types/forms";

type Screen = "choice" | "phone-lookup" | "email-fallback" | "creating";

export function IntakeStartClient() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("choice");
  const [phone, setPhone] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState<ReturningPatientPrefill | null>(null);

  /** Format phone as (XXX) XXX-XXXX for display, store digits only */
  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    if (digits.length <= 3) {
      setPhoneDisplay(digits);
    } else if (digits.length <= 6) {
      setPhoneDisplay(`(${digits.slice(0, 3)}) ${digits.slice(3)}`);
    } else {
      setPhoneDisplay(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`);
    }
  }

  async function handleNewPatient() {
    setScreen("creating");
    setError(null);

    const result = await createUnifiedIntakeSubmission("New Patient");
    if ("error" in result) {
      setError(result.error);
      setScreen("choice");
      return;
    }

    router.push(`/intake/${result.token}?handoff=1`);
  }

  async function handlePhoneLookup() {
    if (!phone.trim()) return;
    if (!dob) { setError("Date of birth is required for verification"); return; }
    setLoading(true);
    setError(null);

    const result = await lookupReturningPatient(phone, "phone", dob);

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if ("notFound" in result) {
      setError(null);
      setScreen("email-fallback");
      setLoading(false);
      return;
    }

    setPrefill(result.prefill);
    await createAndRedirect(result.prefill);
  }

  async function handleEmailLookup() {
    if (!email.trim()) return;
    if (!dob) { setError("Date of birth is required for verification"); return; }
    setLoading(true);
    setError(null);

    const result = await lookupReturningPatient(email, "email", dob);

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if ("notFound" in result) {
      // Neither phone nor email found — redirect to new patient flow
      setError(null);
      setScreen("creating");

      const pkgResult = await createUnifiedIntakeSubmission("New Patient");
      if ("error" in pkgResult) {
        setError(pkgResult.error);
        setScreen("email-fallback");
        setLoading(false);
        return;
      }

      router.push(`/intake/${pkgResult.token}?handoff=1`);
      return;
    }

    setPrefill(result.prefill);
    await createAndRedirect(result.prefill);
  }

  async function createAndRedirect(data: ReturningPatientPrefill) {
    setScreen("creating");

    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const result = await createUnifiedIntakeSubmission(fullName, data.customerId);

    if ("error" in result) {
      setError(result.error);
      setScreen("choice");
      setLoading(false);
      return;
    }

    router.push(`/intake/${result.token}?handoff=1`);
  }

  const inputCls =
    "w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50";

  // ─── Choice Screen ───
  if (screen === "choice") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 px-4">
        {/* Logo */}
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Mint Vision Optique</h1>
          <p className="text-gray-500">Let&apos;s get your intake forms ready.</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={handleNewPatient}
            className="w-full flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all text-left group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">I&apos;m a New Patient</p>
              <p className="text-sm text-gray-500">First time visiting us</p>
            </div>
          </button>

          <button
            onClick={() => setScreen("phone-lookup")}
            className="w-full flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all text-left group"
          >
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-teal-600">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">I&apos;m a Returning Patient</p>
              <p className="text-sm text-gray-500">I&apos;ve been here before</p>
            </div>
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 max-w-sm">{error}</p>
        )}
      </div>
    );
  }

  // ─── Phone Lookup ───
  if (screen === "phone-lookup") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-teal-600">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-bold text-gray-900">Welcome Back!</h1>
          <p className="text-gray-500">
            Enter your phone number and date of birth to verify your identity.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phoneDisplay}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(647) 648-5809"
              autoFocus
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={inputCls}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handlePhoneLookup}
            disabled={loading || !phone.trim() || !dob}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? "Verifying..." : "Verify & Look Up"}
          </button>

          <button
            onClick={() => { setScreen("choice"); setError(null); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ─── Email Fallback ───
  if (screen === "email-fallback") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-amber-600">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-bold text-gray-900">No match found</h1>
          <p className="text-gray-500">
            We couldn&apos;t verify with that phone number. Try your email address instead?
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
              className={inputCls}
            />
          </div>

          {!dob && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleEmailLookup}
            disabled={loading || !email.trim() || !dob}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? "Verifying..." : "Verify with Email"}
          </button>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500 mb-3">
              Still can&apos;t find you? No problem — we&apos;ll set you up as a new patient.
            </p>
            <button
              onClick={handleNewPatient}
              className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Continue as New Patient
            </button>
          </div>

          <button
            onClick={() => { setScreen("phone-lookup"); setError(null); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to phone lookup
          </button>
        </div>
      </div>
    );
  }

  // ─── Creating (loading state) ───
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <p className="text-gray-500">Preparing your forms...</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
