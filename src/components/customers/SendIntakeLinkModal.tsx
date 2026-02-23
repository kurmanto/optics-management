"use client";

import { useState } from "react";
import { Mail, Link2, CheckCircle2, Copy, X, AlertCircle } from "lucide-react";
import { sendIntakeLinkEmail, createIntakeLinkForCustomer } from "@/lib/actions/forms";

interface Props {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  baseUrl: string;
  onClose: () => void;
}

type Step = "choose" | "result";

export function SendIntakeLinkModal({ customerId, customerName, customerEmail, baseUrl, onClose }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intakeUrl = token ? `${baseUrl}/intake/${token}` : null;

  async function handleEmail() {
    setLoading(true);
    setError(null);
    const result = await sendIntakeLinkEmail(customerId);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setToken(result.token);
    setEmailSent(true);
    setStep("result");
  }

  async function handleCopyLink() {
    setLoading(true);
    setError(null);
    const result = await createIntakeLinkForCustomer(customerId);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setToken(result.token);
    setStep("result");
  }

  async function copyToClipboard() {
    if (!intakeUrl) return;
    await navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Send Intake Forms</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Choose Step */}
          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Send intake forms to <span className="font-medium text-gray-700">{customerName}</span>
              </p>

              {/* Email option */}
              <button
                onClick={handleEmail}
                disabled={loading || !customerEmail}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary/50 hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-none group"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 group-disabled:bg-gray-50">
                  <Mail className="w-5 h-5 text-blue-600 group-disabled:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 group-disabled:text-gray-400">Email Intake Forms</p>
                  {customerEmail ? (
                    <p className="text-sm text-gray-500 truncate">{customerEmail}</p>
                  ) : (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> No email on file
                    </p>
                  )}
                </div>
              </button>

              {/* Copy link option */}
              <button
                onClick={handleCopyLink}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary/50 hover:shadow-sm transition-all text-left disabled:opacity-50 group"
              >
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Copy Intake Link</p>
                  <p className="text-sm text-gray-500">Share via SMS, WhatsApp, etc.</p>
                </div>
              </button>

              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}

              {loading && (
                <p className="text-sm text-gray-500 text-center mt-2">Creating intake package...</p>
              )}
            </div>
          )}

          {/* Result Step */}
          {step === "result" && (
            <div className="space-y-4">
              {emailSent && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700">
                    Email sent to <span className="font-medium">{customerEmail}</span>
                  </p>
                </div>
              )}

              {intakeUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Intake Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={intakeUrl}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-gray-50 truncate"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors text-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
