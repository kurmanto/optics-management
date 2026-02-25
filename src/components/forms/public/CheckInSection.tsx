"use client";

import { useState } from "react";
import type { IntakeFormState, IntakeFormAction } from "@/lib/types/unified-intake";

type Props = {
  state: IntakeFormState;
  dispatch: React.Dispatch<IntakeFormAction>;
};

function RadioCard({
  name,
  value,
  selected,
  label,
  description,
  onChange,
}: {
  name: string;
  value: string;
  selected: boolean;
  label: string;
  description?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onChange}
        className="mt-0.5 accent-primary"
      />
      <div>
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

function CheckboxCard({
  value,
  checked,
  label,
  onChange,
}: {
  value: string;
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
        checked
          ? "border-primary bg-primary/5"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <input
        type="checkbox"
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      <span className="text-sm text-gray-900">{label}</span>
    </label>
  );
}

const INSURANCE_PROVIDERS = [
  "Sun Life",
  "Manulife",
  "Great-West Life (Canada Life)",
  "Green Shield Canada (GSC)",
  "Blue Cross (various provinces)",
  "Desjardins Insurance",
  "Industrial Alliance (iA)",
  "Equitable Life",
  "Empire Life",
  "SSQ Insurance",
  "Beneva",
  "Cowan Insurance Group",
  "Johnston Group (Chambers of Commerce)",
  "CINUP",
  "NIHB (Non-Insured Health Benefits)",
  "ODSP / Ontario Works",
  "Veterans Affairs Canada",
  "Other",
];

const WHO_OPTIONS = ["Myself", "My child(ren)", "My spouse/partner", "My parent", "Other"];
const INSURANCE_OPTIONS = ["Yes, I have vision insurance", "No, I don't have vision insurance", "Not sure"];
const HEAR_OPTIONS = [
  "Google search",
  "Social media (Instagram/Facebook)",
  "Walk-by / saw the store",
  "Friend or family referral",
  "Doctor referral",
  "Insurance provider list",
  "Other",
];
const PATIENT_COUNTS = [1, 2, 3, 4, 5];

function InsuranceDetailsBlock({ state, dispatch }: Props) {
  const isKnownProvider = INSURANCE_PROVIDERS.filter((p) => p !== "Other").includes(
    state.insuranceProviderName
  );
  const [showOtherInput, setShowOtherInput] = useState(
    // On mount, show the "Other" input if provider has a custom value
    state.insuranceProviderName !== "" && !isKnownProvider
  );

  const selectValue = isKnownProvider
    ? state.insuranceProviderName
    : showOtherInput
    ? "Other"
    : "";

  return (
    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
      <p className="text-sm font-medium text-blue-800">Insurance Details</p>
      <p className="text-xs text-blue-600">
        Please provide your insurance information so we can verify your benefits.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Insurance Provider <span className="text-red-500">*</span>
          </label>
          <select
            value={selectValue}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "Other") {
                setShowOtherInput(true);
                dispatch({ type: "SET_FIELD", field: "insuranceProviderName", value: "" });
              } else {
                setShowOtherInput(false);
                dispatch({ type: "SET_FIELD", field: "insuranceProviderName", value: val });
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
          >
            <option value="">Select your insurance provider</option>
            {INSURANCE_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {showOtherInput && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Provider Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={state.insuranceProviderName}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "insuranceProviderName", value: e.target.value })
              }
              placeholder="Enter your insurance provider name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
              autoFocus
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Policy Number</label>
          <input
            type="text"
            value={state.insurancePolicyNumber}
            onChange={(e) =>
              dispatch({ type: "SET_FIELD", field: "insurancePolicyNumber", value: e.target.value })
            }
            placeholder="Policy #"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Member ID</label>
          <input
            type="text"
            value={state.insuranceMemberId}
            onChange={(e) =>
              dispatch({ type: "SET_FIELD", field: "insuranceMemberId", value: e.target.value })
            }
            placeholder="Member / Certificate ID"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
          />
        </div>
      </div>
    </div>
  );
}

export function CheckInSection({ state, dispatch }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Check-In</h2>
        <p className="text-sm text-gray-500">Let us know a bit about your visit today.</p>
      </div>

      {/* Q1: Visit Type */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          What type of visit is this? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RadioCard
            name="visitType"
            value="COMPLETE_EYE_EXAM"
            selected={state.visitType === "COMPLETE_EYE_EXAM"}
            label="Complete Eye Exam"
            description="Full eye health examination with an optometrist"
            onChange={() => dispatch({ type: "SET_FIELD", field: "visitType", value: "COMPLETE_EYE_EXAM" })}
          />
          <RadioCard
            name="visitType"
            value="EYEWEAR_ONLY"
            selected={state.visitType === "EYEWEAR_ONLY"}
            label="Eyewear Only"
            description="Shopping for frames or lenses — no exam needed"
            onChange={() => dispatch({ type: "SET_FIELD", field: "visitType", value: "EYEWEAR_ONLY" })}
          />
        </div>
      </div>

      {/* Q2: New or Returning */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Have you visited us before? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RadioCard
            name="newOrReturning"
            value="NEW"
            selected={state.newOrReturning === "NEW"}
            label="New Patient"
            description="First time at Mint Vision Optique"
            onChange={() => dispatch({ type: "SET_FIELD", field: "newOrReturning", value: "NEW" })}
          />
          <RadioCard
            name="newOrReturning"
            value="RETURNING"
            selected={state.newOrReturning === "RETURNING"}
            label="Returning Patient"
            description="I've been here before"
            onChange={() => dispatch({ type: "SET_FIELD", field: "newOrReturning", value: "RETURNING" })}
          />
        </div>
      </div>

      {/* Q3: Who is this for */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Who is this visit for? <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500">Select all that apply</p>
        <div className="grid grid-cols-2 gap-2">
          {WHO_OPTIONS.map((opt) => (
            <CheckboxCard
              key={opt}
              value={opt}
              checked={state.whoIsThisFor.includes(opt)}
              label={opt}
              onChange={(checked) => {
                const current = state.whoIsThisFor;
                const updated = checked
                  ? [...current, opt]
                  : current.filter((v) => v !== opt);
                dispatch({ type: "SET_FIELD", field: "whoIsThisFor", value: updated });
              }}
            />
          ))}
        </div>
      </div>

      {/* Q4: How many patients */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          How many patients? <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {PATIENT_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => dispatch({ type: "SET_PATIENT_COUNT", count: n })}
              className={`w-12 h-12 rounded-xl border-2 font-semibold text-sm transition-all ${
                state.patientCount === n
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Q5: Vision insurance (only for eye exam) */}
      {state.visitType === "COMPLETE_EYE_EXAM" && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Do you have vision insurance? <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {INSURANCE_OPTIONS.map((opt) => (
              <RadioCard
                key={opt}
                name="visionInsurance"
                value={opt}
                selected={state.visionInsurance === opt}
                label={opt}
                onChange={() => dispatch({ type: "SET_FIELD", field: "visionInsurance", value: opt })}
              />
            ))}
          </div>

          {/* Insurance details (when "Yes") */}
          {state.visionInsurance === "Yes, I have vision insurance" && (
            <InsuranceDetailsBlock state={state} dispatch={dispatch} />
          )}
        </div>
      )}

      {/* Q6: How did you hear about us */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          How did you hear about us? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2">
          {HEAR_OPTIONS.map((opt) => (
            <RadioCard
              key={opt}
              name="hearAboutUs"
              value={opt}
              selected={state.hearAboutUs === opt}
              label={opt}
              onChange={() => dispatch({ type: "SET_FIELD", field: "hearAboutUs", value: opt })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
