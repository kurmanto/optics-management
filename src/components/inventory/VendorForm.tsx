"use client";

import { useActionState } from "react";
import { VendorFormState } from "@/lib/actions/vendors";
import { Vendor } from "@prisma/client";

type Props = {
  action: (state: VendorFormState, formData: FormData) => Promise<VendorFormState>;
  vendor?: Vendor;
};

const PAYMENT_TERMS_OPTIONS = ["NET30", "NET60", "COD", "Prepaid", "Other"];

const PAYMENT_METHODS = [
  { value: "Credit Card", label: "Credit Card" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "E-Transfer", label: "E-Transfer" },
];

export function VendorForm({ action, vendor }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});

  const err = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Vendor Information</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            defaultValue={vendor?.name || ""}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. Safilo Group"
          />
          {err("name") && <p className="text-red-500 text-xs mt-1">{err("name")}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
            <input
              name="contactName"
              defaultValue={vendor?.contactName || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={vendor?.email || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="orders@vendor.com"
            />
            {err("email") && <p className="text-red-500 text-xs mt-1">{err("email")}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              defaultValue={vendor?.phone || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="1-800-555-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              name="website"
              defaultValue={vendor?.website || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://vendor.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            name="address"
            defaultValue={vendor?.address || ""}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="123 Main St, Toronto, ON M5V 1A1"
          />
        </div>
      </div>

      {/* Order Terms */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Order Terms</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <select
              name="paymentTerms"
              defaultValue={vendor?.paymentTerms || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">— Select —</option>
              {PAYMENT_TERMS_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Qty</label>
            <input
              name="minOrderQty"
              type="number"
              min="0"
              defaultValue={vendor?.minOrderQty ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
            <input
              name="leadTimeDays"
              type="number"
              min="0"
              defaultValue={vendor?.leadTimeDays ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="14"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Methods</label>
          <div className="flex flex-wrap gap-3">
            {PAYMENT_METHODS.map((m) => (
              <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value={m.value}
                  defaultChecked={vendor?.paymentMethods?.includes(m.value)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Return Policy</label>
          <textarea
            name="returnPolicy"
            defaultValue={vendor?.returnPolicy || ""}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="e.g. 30-day return window for defective items..."
          />
        </div>
      </div>

      {/* Sales Rep */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Sales Representative</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rep Name</label>
            <input
              name="repName"
              defaultValue={vendor?.repName || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Sales rep name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rep Email</label>
            <input
              name="repEmail"
              type="email"
              defaultValue={vendor?.repEmail || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="rep@vendor.com"
            />
            {err("repEmail") && <p className="text-red-500 text-xs mt-1">{err("repEmail")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rep Phone</label>
            <input
              name="repPhone"
              defaultValue={vendor?.repPhone || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="416-555-0000"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea
          name="notes"
          defaultValue={vendor?.notes || ""}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          placeholder="Any additional notes about this vendor..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <a
          href={vendor ? `/inventory/vendors/${vendor.id}` : "/inventory/vendors"}
          className="inline-flex items-center h-9 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-150"
        >
          {isPending ? "Saving..." : vendor ? "Save Changes" : "Add Vendor"}
        </button>
      </div>
    </form>
  );
}
