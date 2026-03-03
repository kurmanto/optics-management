"use client";

import { useState } from "react";

interface LeadCaptureFormProps {
  onSubmit: (data: { firstName: string; phone: string; email: string; preferredTimeframe: string }) => void;
  isPending: boolean;
}

export function LeadCaptureForm({ onSubmit, isPending }: LeadCaptureFormProps) {
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const firstName = (fd.get("firstName") as string).trim();
    const phone = (fd.get("phone") as string).trim();
    const email = (fd.get("email") as string).trim();
    const preferredTimeframe = (fd.get("preferredTimeframe") as string).trim();

    if (!firstName) {
      setError("Please enter your first name.");
      return;
    }
    if (!phone && !email) {
      setError("Please provide a phone number or email so we can reach you.");
      return;
    }
    setError("");
    onSubmit({ firstName, phone, email, preferredTimeframe });
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Almost done!</h2>
        <p className="text-sm text-gray-500 mt-1">
          We&apos;ll send your personalized recommendation and help you book.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First name *
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Jane"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="(647) 648-5809"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="jane@example.com"
          />
        </div>

        <div>
          <label htmlFor="preferredTimeframe" className="block text-sm font-medium text-gray-700 mb-1">
            When are you hoping to come in?
          </label>
          <select
            id="preferredTimeframe"
            name="preferredTimeframe"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">No preference</option>
            <option value="This week">This week</option>
            <option value="Next week">Next week</option>
            <option value="Within a month">Within a month</option>
            <option value="Just browsing">Just browsing</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isPending ? "Getting your results..." : "See My Recommendation"}
        </button>

        <p className="text-center text-[11px] text-gray-400">
          Your information is kept private and never shared.
        </p>
      </form>
    </div>
  );
}
