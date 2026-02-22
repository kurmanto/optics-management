"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Gift, Users } from "lucide-react";
import { generateReferralCode } from "@/lib/actions/referrals";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

type Referral = {
  id: string;
  code: string | null;
  status: string;
  rewardAmount: number | null;
  createdAt: Date;
  referred: { firstName: string; lastName: string } | null;
};

type Props = {
  customerId: string;
  firstName: string;
  lastName: string;
  referralsGiven: Referral[];
};

export function ReferralCodeCard({ customerId, firstName, lastName, referralsGiven }: Props) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [currentCode, setCurrentCode] = useState<string | null>(
    referralsGiven.find((r) => r.status === "PENDING" && r.code)?.code ?? null
  );

  const qualifiedReferrals = referralsGiven.filter((r) => r.status === "QUALIFIED" || r.status === "REWARDED");
  const totalRewards = qualifiedReferrals.reduce((sum, r) => sum + (r.rewardAmount ?? 25), 0);

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateReferralCode(customerId);
      if ("code" in result) {
        setCurrentCode(result.code);
      }
    });
  }

  function handleCopy() {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Referral code display */}
      <div className="border border-dashed border-primary/40 rounded-xl p-4 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-gray-900">Referral Code</span>
        </div>

        {currentCode ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 font-mono text-lg font-bold text-primary tracking-widest">
              {currentCode}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/30 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={pending}
            className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
          >
            {pending ? "Generating..." : "Generate Referral Code"}
          </button>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Share this code — when a friend makes a purchase, {firstName} earns $25 store credit.
        </p>
      </div>

      {/* Referral history */}
      {referralsGiven.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Referral History</span>
          </div>

          <div className="space-y-2">
            {referralsGiven.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    {r.referred ? `${r.referred.firstName} ${r.referred.lastName}` : "Pending referral"}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("en-CA")}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "QUALIFIED" || r.status === "REWARDED"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {r.status === "QUALIFIED" || r.status === "REWARDED" ? `+${formatCurrency(r.rewardAmount ?? 25)}` : r.status}
                </span>
              </div>
            ))}
          </div>

          {totalRewards > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold">
              <span className="text-gray-700">Total Referral Rewards</span>
              <span className="text-primary">{formatCurrency(totalRewards)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
