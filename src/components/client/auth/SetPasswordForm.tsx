"use client";

import { useActionState } from "react";
import { setClientPassword } from "@/lib/actions/client-auth";
import { CheckCircle } from "lucide-react";

export function SetPasswordForm() {
  const [state, action, isPending] = useActionState(setClientPassword, null);

  if (state?.success) {
    return (
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Password set!</h3>
        <p className="text-sm text-gray-500">
          You can now sign in with your email and password.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          8+ characters, with uppercase, lowercase, and a number
        </p>
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm password
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Setting password..." : "Set password"}
      </button>
    </form>
  );
}
