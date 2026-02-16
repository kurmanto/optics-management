"use client";

import { useActionState } from "react";
import { CustomerFormState } from "@/lib/actions/customers";
import { Customer, Family } from "@prisma/client";

type Props = {
  action: (state: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  customer?: Customer;
  families?: Family[];
};

export function CustomerForm({ action, customer, families = [] }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Basic Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              name="firstName"
              defaultValue={customer?.firstName || ""}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {state.fieldErrors?.firstName && (
              <p className="text-red-500 text-xs mt-1">{state.fieldErrors.firstName[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              name="lastName"
              defaultValue={customer?.lastName || ""}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {state.fieldErrors?.lastName && (
              <p className="text-red-500 text-xs mt-1">{state.fieldErrors.lastName[0]}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              type="tel"
              defaultValue={customer?.phone || ""}
              placeholder="(416) 555-0123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={customer?.email || ""}
              placeholder="patient@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              name="dateOfBirth"
              type="date"
              defaultValue={
                customer?.dateOfBirth
                  ? new Date(customer.dateOfBirth).toISOString().split("T")[0]
                  : ""
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              name="gender"
              defaultValue={customer?.gender || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Address</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input
            name="address"
            defaultValue={customer?.address || ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              name="city"
              defaultValue={customer?.city || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select
              name="province"
              defaultValue={customer?.province || "ON"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">—</option>
              <option value="ON">Ontario</option>
              <option value="QC">Quebec</option>
              <option value="BC">British Columbia</option>
              <option value="AB">Alberta</option>
              <option value="MB">Manitoba</option>
              <option value="SK">Saskatchewan</option>
              <option value="NS">Nova Scotia</option>
              <option value="NB">New Brunswick</option>
              <option value="NL">Newfoundland</option>
              <option value="PE">PEI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
            <input
              name="postalCode"
              defaultValue={customer?.postalCode || ""}
              placeholder="M5V 3A8"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Family & Notes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Additional Info</h2>

        {families.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Family Group</label>
            <select
              name="familyId"
              defaultValue={customer?.familyId || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">No family group</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
          <textarea
            name="notes"
            defaultValue={customer?.notes || ""}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="VIP customer, allergies, preferences..."
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="smsOptIn"
              defaultChecked={customer?.smsOptIn ?? true}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">SMS opt-in</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="emailOptIn"
              defaultChecked={customer?.emailOptIn ?? true}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Email opt-in</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <a
          href={customer ? `/customers/${customer.id}` : "/customers"}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-150"
        >
          {isPending ? "Saving..." : customer ? "Save Changes" : "Create Customer"}
        </button>
      </div>
    </form>
  );
}
