"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MagicLinkForm } from "@/components/client/auth/MagicLinkForm";
import { PasswordLoginForm } from "@/components/client/auth/PasswordLoginForm";
import { cn } from "@/lib/utils/cn";

export default function ClientLoginPage() {
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">MV</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Welcome Back</h1>
          <p className="text-sm text-gray-500">Sign in to your family vision portal</p>
        </div>

        {/* Idle timeout notice */}
        {reason === "idle_timeout" && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-800">
              Your session expired due to inactivity. Please sign in again.
            </p>
          </div>
        )}

        {/* Auth form card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          {/* Tab toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mode === "magic"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Email Link
            </button>
            <button
              type="button"
              onClick={() => setMode("password")}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mode === "password"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Password
            </button>
          </div>

          {mode === "magic" ? <MagicLinkForm /> : <PasswordLoginForm />}
        </div>

        <p className="text-center text-xs text-gray-400">
          This portal is for Mint Vision patients only.
          <br />
          Ask your optician to enable portal access.
        </p>
      </div>
    </div>
  );
}
