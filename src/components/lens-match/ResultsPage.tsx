"use client";

import { useState } from "react";
import { PackageCard } from "./PackageCard";
import { LensMatchBooking } from "./LensMatchBooking";
import { LensMatchCallbackForm } from "./LensMatchCallbackForm";
import type { Recommendation } from "@/lib/utils/lens-packages";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface ResultsPageProps {
  recommendation: Recommendation;
  quoteId: string;
  firstName: string;
  isLoggedIn: boolean;
  members?: Member[];
}

export function ResultsPage({ recommendation, quoteId, firstName, isLoggedIn, members = [] }: ResultsPageProps) {
  const { primary, upgrade, alternative, whyBullets, sunglassesNote } = recommendation;
  const [bookingType, setBookingType] = useState<"CONSULTATION" | "EYE_EXAM" | null>(null);

  // Show booking/callback flow when a CTA is clicked
  if (bookingType) {
    if (isLoggedIn && members.length > 0) {
      return (
        <div className="space-y-4">
          <LensMatchBooking
            quoteId={quoteId}
            bookingType={bookingType}
            members={members}
            onBack={() => setBookingType(null)}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <LensMatchCallbackForm
          quoteId={quoteId}
          bookingType={bookingType}
          onBack={() => setBookingType(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {firstName}, here&apos;s your match
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Based on your answers, we recommend the following lens package.
        </p>
      </div>

      {/* Primary package */}
      <PackageCard pkg={primary} variant="primary" />

      {/* Why bullets */}
      {whyBullets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Why this fits you</h3>
          <ul className="space-y-2">
            {whyBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary mt-0.5">-</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sunglasses note */}
      {sunglassesNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Sunglasses:</span> {sunglassesNote}
          </p>
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-3">
        <button
          onClick={() => setBookingType("CONSULTATION")}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Book 15-Min Consult
        </button>
        <button
          onClick={() => setBookingType("EYE_EXAM")}
          className="w-full py-3.5 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors"
        >
          Book Eye Exam
        </button>
      </div>

      {/* Alternatives */}
      {upgrade && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
            Want even better?
          </p>
          <PackageCard pkg={upgrade} variant="upgrade" />
        </div>
      )}

      {alternative && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
            Looking to save?
          </p>
          <PackageCard pkg={alternative} variant="alternative" />
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-[11px] text-gray-400 pb-6">
        Final pricing is confirmed in-store after prescription verification and measurements.
        Prices shown are estimates and may vary based on your specific needs.
      </p>
    </div>
  );
}
