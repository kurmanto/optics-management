"use client";

import { useState } from "react";
import { Share2, Copy, Check, MessageSquare, Mail } from "lucide-react";

interface ShareStyleButtonProps {
  label: string;
  customerId: string;
}

export function ShareStyleButton({ label, customerId }: ShareStyleButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/my/style/share/${customerId}`
    : "";

  const shareText = `I'm a "${label}" at Mint Vision Optique! Take the quiz: ${shareUrl}`;

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Style: ${label}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const smsBody = encodeURIComponent(shareText);
  const emailSubject = encodeURIComponent(`My Eyewear Style: ${label}`);
  const emailBody = encodeURIComponent(
    `Hey!\n\nI just took the Style ID quiz at Mint Vision Optique and I'm a "${label}"!\n\nTake the quiz and find your style: ${shareUrl}`
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center justify-center gap-2 w-full text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg py-2.5 transition-colors"
      >
        <Share2 className="h-4 w-4" />
        Share Your Style
      </button>

      {showOptions && (
        <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-3 space-y-2">
          <p className="text-xs text-gray-500 mb-2">Share how you rolled</p>
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
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg py-2 px-3 hover:bg-gray-50 transition-colors text-gray-700"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
