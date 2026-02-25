"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createInitialFormState,
  intakeFormReducer,
  type IntakeFormState,
} from "@/lib/types/unified-intake";
import type { ReturningPatientPrefill } from "@/lib/types/forms";
import { completeUnifiedIntake } from "@/lib/actions/forms";
import { CheckInSection } from "./CheckInSection";
import { ContactDetailsSection } from "./ContactDetailsSection";
import { PatientIntakeBlock } from "./PatientIntakeBlock";

type Props = {
  token: string;
  prefillData?: ReturningPatientPrefill | null;
};

function buildPrefillState(prefill: ReturningPatientPrefill): Partial<IntakeFormState> {
  return {
    newOrReturning: "RETURNING",
    contactFullName: `${prefill.firstName} ${prefill.lastName}`.trim(),
    contactTelephone: prefill.phone || "",
    contactAddress: prefill.address || "",
    contactCity: prefill.city || "",
    contactEmail: prefill.email || "",
    hearAboutUs: prefill.hearAboutUs || "",
    patients: [
      {
        fullName: `${prefill.firstName} ${prefill.lastName}`.trim(),
        gender: prefill.gender || "",
        sameContactAsPrimary: false,
        telephone: prefill.phone || "",
        address: prefill.address || "",
        dateOfBirth: prefill.dateOfBirth || "",
        medications: "",
        allergies: "",
        healthConditions: [],
        familyEyeConditions: [],
        screenHoursPerDay: "",
        currentlyWearGlasses: [],
        dilationPreference: "",
        mainReasonForExam: "",
        biggestVisionAnnoyance: "",
        examConcerns: "",
      },
    ],
  };
}

export function UnifiedIntakeForm({ token, prefillData }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialState = createInitialFormState();
  const [state, dispatch] = useReducer(
    intakeFormReducer,
    initialState,
    (init) => {
      if (prefillData) {
        return { ...init, ...buildPrefillState(prefillData) };
      }
      return init;
    }
  );

  const isEyeExam = state.visitType === "COMPLETE_EYE_EXAM";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await completeUnifiedIntake(token, state);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Success — redirect to the same token page (which will show completion screen)
    router.push(`/intake/${token}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Section 1: Check-In */}
      <section>
        <CheckInSection state={state} dispatch={dispatch} />
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Section 2: Contact Details */}
      <section>
        <ContactDetailsSection state={state} dispatch={dispatch} />
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Section 3: Patient Intake Blocks */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Patient Information</h2>
          <p className="text-sm text-gray-500">
            Please fill in the details for{" "}
            {state.patientCount === 1
              ? "the patient"
              : `each of the ${state.patientCount} patients`}
            .
          </p>
        </div>

        {state.patients.map((patient, i) => (
          <PatientIntakeBlock
            key={i}
            index={i}
            isFirstPatient={i === 0}
            isEyeExam={isEyeExam}
            data={patient}
            onUpdate={(data) => dispatch({ type: "UPDATE_PATIENT", index: i, data })}
          />
        ))}
      </section>

      {/* Submit */}
      <div className="space-y-4 pb-8">
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-primary text-white text-base font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60 transition-all shadow-sm"
        >
          {submitting ? "Submitting..." : "Submit Intake Form"}
        </button>
        <p className="text-xs text-center text-gray-400">
          Your information is stored securely by Mint Vision Optique.
        </p>
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Return to staff dashboard? Any unsaved form data will be lost.")) {
                router.push("/");
              }
            }}
            className="w-full py-3 border border-gray-300 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard (Staff)
          </button>
        </div>
      </div>
    </form>
  );
}
