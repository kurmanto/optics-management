"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/auth";

export function ChangePasswordForm() {
  const [state, action, isPending] = useActionState(changePassword, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          Password changed successfully.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
        <input
          name="currentPassword"
          type="password"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
        <input
          name="confirmPassword"
          type="password"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {isPending ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
