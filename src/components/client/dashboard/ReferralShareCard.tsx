"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Share2, MessageSquare, Mail } from "lucide-react";
import { getOrCreateReferralCode } from "@/lib/actions/client-referrals";

export function ReferralShareCard() {
  const [code, setCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateReferralCode().then((result) => {
      if (!("error" in result)) {
        setCode(result.code);
        setReferralCount(result.referralCount);
      }
      setLoading(false);
    });
  }, []);

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    if (!code) return;
    const shareData = {
      title: "Mint Vision Optique Referral",
      text: `Use my referral code ${code} at Mint Vision Optique and we both get $25!`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled — ignore
      }
    }
  }

  const smsBody = encodeURIComponent(
    `Check out Mint Vision Optique! Use my referral code ${code} and we both get $25. 🎉`
  );
  const emailSubject = encodeURIComponent("Mint Vision Optique Referral");
  const emailBody = encodeURIComponent(
    `Hi!\n\nI wanted to share my referral code for Mint Vision Optique: ${code}\n\nUse it when you visit and we both get $25!\n\nSee you there!`
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!code) return null;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-purple-50 rounded-xl border border-primary/10 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Refer a Friend</h3>
        {referralCount > 0 && (
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {referralCount} referral{referralCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600 mb-3">
        Share your code — you both get <span className="font-semibold text-primary">$25</span> in store credit!
      </p>

      {/* Code display + copy */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
          <span className="font-mono font-bold text-lg tracking-wider text-gray-900">{code}</span>
        </div>
        <button
          onClick={handleCopy}
          className="h-10 w-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors shrink-0"
          title="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={handleNativeShare}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-primary text-white rounded-lg py-2 hover:bg-primary/90 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        )}
        <a
          href={`sms:?body=${smsBody}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors text-gray-700"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Text
        </a>
        <a
          href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors text-gray-700"
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </a>
      </div>
    </div>
  );
}
