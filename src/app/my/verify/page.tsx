"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyMagicLink } from "@/lib/actions/client-auth";
import { SetPasswordForm } from "@/components/client/auth/SetPasswordForm";
import { Loader2, XCircle } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const isReset = searchParams.get("reset") === "1";

  const [status, setStatus] = useState<"loading" | "error" | "set_password" | "success">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No token provided.");
      return;
    }

    verifyMagicLink(token).then((result) => {
      if (result.error) {
        setStatus("error");
        setErrorMsg(result.error);
      } else if (result.resetPassword || isReset) {
        setStatus("set_password");
      } else {
        setStatus("success");
        router.push("/my");
      }
    });
  }, [token, isReset, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-gray-500">Verifying your link...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Link Invalid</h2>
          <p className="text-sm text-gray-500">{errorMsg}</p>
          <Link
            href="/my/login"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (status === "set_password") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">MV</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Set Your Password</h1>
            <p className="text-sm text-gray-500">
              Create a password so you can sign in without an email link.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <SetPasswordForm />
          </div>

          <div className="text-center">
            <Link
              href="/my"
              className="text-sm text-primary font-medium hover:text-primary/80"
            >
              Skip for now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // success — redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-gray-500">Redirecting...</p>
      </div>
    </div>
  );
}
