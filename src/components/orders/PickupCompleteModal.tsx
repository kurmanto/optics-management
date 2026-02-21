"use client";

import { useState } from "react";
import { handlePickupComplete } from "@/lib/actions/orders";
import { X, Star, Users, AlertTriangle, Gift } from "lucide-react";

type Props = {
  orderId: string;
  orderTotal: number;
  customerMarketingOptOut: boolean;
  hasFamilyMembers?: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PickupCompleteModal({
  orderId,
  orderTotal,
  customerMarketingOptOut,
  hasFamilyMembers = false,
  onClose,
  onSuccess,
}: Props) {
  const [sendReviewRequest, setSendReviewRequest] = useState(orderTotal > 500);
  const [enrollInReferralCampaign, setEnrollInReferralCampaign] = useState(true);
  const [enrollInFamilyPromo, setEnrollInFamilyPromo] = useState(hasFamilyMembers);
  const [markAsLowValue, setMarkAsLowValue] = useState(false);
  const [pickupNotes, setPickupNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setPending(true);
    setError("");

    const result = await handlePickupComplete(orderId, {
      sendReviewRequest,
      enrollInReferralCampaign,
      enrollInFamilyPromo,
      markAsLowValue,
      notes: pickupNotes || undefined,
    });

    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mark as Picked Up</h2>
            <p className="text-sm text-gray-500 mt-0.5">Choose post-pickup engagement options</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {customerMarketingOptOut && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">This customer has opted out of marketing.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={sendReviewRequest}
              onChange={(e) => setSendReviewRequest(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-sm font-semibold text-gray-900">Send review request now</span>
                {orderTotal > 500 && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Recommended</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">SMS to ask for a Google review</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={enrollInReferralCampaign}
              onChange={(e) => setEnrollInReferralCampaign(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-sm font-semibold text-gray-900">Add to referral campaign</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Starts in 3 days</p>
            </div>
          </label>

          {hasFamilyMembers && (
            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={enrollInFamilyPromo}
                onChange={(e) => setEnrollInFamilyPromo(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-900">Send family promo offer</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Email/SMS family members a special offer (starts in 7 days)</p>
              </div>
            </label>
          )}

          <label className="flex items-start gap-3 p-3 rounded-xl border border-red-100 cursor-pointer hover:bg-red-50 transition-colors">
            <input
              type="checkbox"
              checked={markAsLowValue}
              onChange={(e) => setMarkAsLowValue(e.target.checked)}
              className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Mark as low-value (no marketing)</span>
              </div>
              <p className="text-xs text-red-500 mt-0.5">Opts this customer out of all future campaigns</p>
            </div>
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Pickup Notes (optional)</label>
          <textarea
            value={pickupNotes}
            onChange={(e) => setPickupNotes(e.target.value)}
            rows={2}
            placeholder="Any notes about this pickup..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {pending ? "Confirming..." : "Confirm Pickup"}
          </button>
        </div>
      </div>
    </div>
  );
}
