"use client";

import type { IntakeFormState, IntakeFormAction } from "@/lib/types/unified-intake";

type Props = {
  state: IntakeFormState;
  dispatch: React.Dispatch<IntakeFormAction>;
};

const CITY_OPTIONS = [
  "Toronto",
  "North York",
  "Scarborough",
  "Etobicoke",
  "Markham",
  "Richmond Hill",
  "Vaughan",
  "Mississauga",
  "Brampton",
  "Oakville",
  "Burlington",
  "Hamilton",
  "Other",
];

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function ContactDetailsSection({ state, dispatch }: Props) {
  const inputCls =
    "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Contact Details</h2>
        <p className="text-sm text-gray-500">
          Who is the primary contact person for this visit? This is the person we&apos;ll reach out
          to with updates.
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={state.contactFullName}
          onChange={(e) =>
            dispatch({ type: "SET_FIELD", field: "contactFullName", value: e.target.value })
          }
          placeholder="e.g. Sarah Chen"
          className={inputCls}
        />
      </div>

      {/* Telephone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Telephone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={formatPhoneInput(state.contactTelephone)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
            dispatch({ type: "SET_FIELD", field: "contactTelephone", value: digits });
          }}
          placeholder="(416) 555-0100"
          className={inputCls}
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={state.contactAddress}
          onChange={(e) =>
            dispatch({ type: "SET_FIELD", field: "contactAddress", value: e.target.value })
          }
          placeholder="123 Main St, Unit 4"
          className={inputCls}
        />
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          City <span className="text-red-500">*</span>
        </label>
        <select
          value={state.contactCity}
          onChange={(e) =>
            dispatch({ type: "SET_FIELD", field: "contactCity", value: e.target.value })
          }
          className={inputCls}
        >
          <option value="">Select city…</option>
          {CITY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={state.contactEmail}
          onChange={(e) =>
            dispatch({ type: "SET_FIELD", field: "contactEmail", value: e.target.value })
          }
          placeholder="sarah@email.com"
          className={inputCls}
        />
      </div>
    </div>
  );
}
