"use client";

import { useActionState, useState, useEffect } from "react";
import { addStoreCredit, deactivateStoreCredit, StoreCreditFormState } from "@/lib/actions/customers";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { Plus, X, CreditCard } from "lucide-react";

type StoreCredit = {
  id: string;
  type: string;
  amount: number;
  usedAmount: number;
  description: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

type Props = {
  customerId: string;
  credits: StoreCredit[];
};

const TYPE_LABELS: Record<string, string> = {
  REFERRAL: "Referral",
  INSURANCE: "Insurance",
  PROMOTION: "Promotion",
  REFUND: "Refund",
};

const TYPE_COLORS: Record<string, string> = {
  REFERRAL: "bg-purple-100 text-purple-700",
  INSURANCE: "bg-blue-100 text-blue-700",
  PROMOTION: "bg-green-100 text-green-700",
  REFUND: "bg-amber-100 text-amber-700",
};

export function StoreCreditManager({ customerId, credits }: Props) {
  const [showForm, setShowForm] = useState(false);

  const boundAction = addStoreCredit.bind(null, customerId);
  const [state, formAction, isPending] = useActionState<StoreCreditFormState, FormData>(
    boundAction,
    {}
  );

  const totalAvailable = credits.reduce((sum, c) => sum + (c.amount - c.usedAmount), 0);

  useEffect(() => {
    if (state.success) setShowForm(false);
  }, [state.success]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Store Credits</h2>
          {credits.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatCurrency(totalAvailable)} available
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add credit
        </button>
      </div>

      {/* Add Credit Form */}
      {showForm && (
        <form
          action={formAction}
          className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3"
        >
          {state.error && (
            <p className="text-red-600 text-xs">{state.error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                name="type"
                required
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="REFERRAL">Referral</option>
                <option value="INSURANCE">Insurance</option>
                <option value="PROMOTION">Promotion</option>
                <option value="REFUND">Refund</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="50.00"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
              <input
                name="description"
                type="text"
                placeholder="e.g. Referred John D."
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expires (optional)</label>
              <input
                name="expiresAt"
                type="date"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Adding..." : "Add Credit"}
            </button>
          </div>
        </form>
      )}

      {/* Credits List */}
      {credits.length === 0 && !showForm ? (
        <div className="py-6 text-center text-gray-400 text-sm">
          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No store credits.
        </div>
      ) : (
        <div className="space-y-2">
          {credits.map((credit) => {
            const remaining = credit.amount - credit.usedAmount;
            const isExpired = credit.expiresAt && new Date(credit.expiresAt) < new Date();
            return (
              <div
                key={credit.id}
                className={`flex items-start justify-between p-3 rounded-lg border ${
                  isExpired ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-100"
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[credit.type] || "bg-gray-100 text-gray-600"}`}>
                      {TYPE_LABELS[credit.type] || credit.type}
                    </span>
                    {isExpired && (
                      <span className="text-xs text-gray-400">Expired</span>
                    )}
                  </div>
                  {credit.description && (
                    <p className="text-xs text-gray-500 truncate">{credit.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Added {formatDate(credit.createdAt)}
                    {credit.expiresAt && ` · Expires ${formatDate(credit.expiresAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(remaining)}</p>
                    {credit.usedAmount > 0 && (
                      <p className="text-xs text-gray-400">of {formatCurrency(credit.amount)}</p>
                    )}
                  </div>
                  <form
                    action={async () => { await deactivateStoreCredit(credit.id); }}
                  >
                    <button
                      type="submit"
                      title="Deactivate"
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
