"use client";

import { useState } from "react";
import { requestLensMatchCallback } from "@/lib/actions/lens-match";
import { CheckCircle, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface LensMatchCallbackFormProps {
  quoteId: string;
  bookingType: "CONSULTATION" | "EYE_EXAM";
  onBack: () => void;
}

export function LensMatchCallbackForm({ quoteId, bookingType, onBack }: LensMatchCallbackFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const label = bookingType === "CONSULTATION" ? "lens consultation" : "eye exam";

  async function handleSubmit() {
    setIsPending(true);
    setError("");

    const result = await requestLensMatchCallback({
      quoteId,
      requestedType: bookingType,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    setSuccess(true);
    setIsPending(false);
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">We&apos;ll be in touch!</h3>
        <p className="text-sm text-gray-500">
          Our team will contact you to schedule your {label}. Check your email for your lens recommendation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="text-center space-y-2 py-2">
        <h3 className="text-sm font-semibold text-gray-900">Request a Callback</h3>
        <p className="text-sm text-gray-500">
          We&apos;ll contact you to schedule your {label}.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Requesting...
          </span>
        ) : (
          "Request Callback"
        )}
      </button>

      <div className="text-center">
        <Link
          href="/my/login?redirect=/my/lens-match"
          className="text-sm text-primary hover:text-primary/80 font-medium"
        >
          Have an account? Log in to book online
        </Link>
      </div>
    </div>
  );
}
