"use client";

import { useActionState } from "react";
import { requestMagicLink } from "@/lib/actions/client-auth";
import { Mail, CheckCircle } from "lucide-react";

export function MagicLinkForm() {
  const [state, action, isPending] = useActionState(requestMagicLink, null);

  if (state?.success) {
    return (
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
        <p className="text-sm text-gray-500">
          If an account exists with that email, we've sent a sign-in link.
          It expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email address
        </label>
        <input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Mail className="h-4 w-4" />
        {isPending ? "Sending..." : "Send me a sign-in link"}
      </button>
    </form>
  );
}
