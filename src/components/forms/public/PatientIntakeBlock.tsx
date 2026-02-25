"use client";

import type { PatientBlockData } from "@/lib/types/unified-intake";
import { DilationDiagram } from "./DilationDiagram";

type Props = {
  index: number;
  isFirstPatient: boolean;
  isEyeExam: boolean;
  data: PatientBlockData;
  onUpdate: (data: Partial<PatientBlockData>) => void;
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const HEALTH_CONDITIONS = [
  "Diabetes",
  "High blood pressure",
  "Heart disease",
  "Thyroid condition",
  "Autoimmune disorder",
  "Cancer (current or past)",
  "None of the above",
];
const FAMILY_EYE_CONDITIONS = [
  "Glaucoma",
  "Macular degeneration",
  "Cataracts",
  "Retinal detachment",
  "Colour blindness",
  "High myopia (strong prescription)",
  "None that I know of",
];
const SCREEN_OPTIONS = ["Less than 2 hours", "2–4 hours", "4–8 hours", "8+ hours"];
const GLASSES_OPTIONS = ["Distance glasses", "Reading glasses", "Progressives/bifocals", "Contact lenses", "None"];
const DILATION_OPTIONS = [
  "Yes, I consent to dilation",
  "No, I prefer no dilation",
  "I'd like to discuss with the doctor first",
];

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function OhipEligibilityNotice({
  dateOfBirth,
  healthConditions,
  familyEyeConditions,
}: {
  dateOfBirth: string;
  healthConditions: string[];
  familyEyeConditions: string[];
}) {
  const age = getAge(dateOfBirth);
  const hasDiabetes = healthConditions.includes("Diabetes");
  const hasGlaucoma = familyEyeConditions.includes("Glaucoma") || healthConditions.includes("Glaucoma");

  const reasons: string[] = [];
  if (age !== null && age < 19) reasons.push("under 19 years old");
  if (age !== null && age >= 65) reasons.push("65 years or older");
  if (hasDiabetes) reasons.push("diabetes");
  if (hasGlaucoma) reasons.push("glaucoma");

  if (reasons.length === 0) return null;

  return (
    <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <div>
        <p className="text-sm font-medium text-green-800">OHIP-Covered Eye Exam</p>
        <p className="text-xs text-green-700 mt-0.5">
          This patient may be eligible for an OHIP-covered eye exam ({reasons.join(", ")}).
          No additional cost for the examination.
        </p>
      </div>
    </div>
  );
}

export function PatientIntakeBlock({ index, isFirstPatient, isEyeExam, data, onUpdate }: Props) {
  const inputCls =
    "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  const patientLabel = `Patient ${index + 1}`;
  const displayName = data.fullName || patientLabel;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
        <h3 className="font-semibold text-gray-900">{displayName}</h3>
        <p className="text-xs text-gray-500">{patientLabel} details</p>
      </div>

      <div className="p-5 space-y-5">
        {/* P1: Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => onUpdate({ fullName: e.target.value })}
            placeholder="Full legal name"
            className={inputCls}
          />
        </div>

        {/* P2: Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onUpdate({ gender: g })}
                className={`px-4 py-2 rounded-xl border-2 text-sm transition-all ${
                  data.gender === g
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* P3: Same contact as primary (only for patient 2+) */}
        {!isFirstPatient && (
          <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-all">
            <input
              type="checkbox"
              checked={data.sameContactAsPrimary}
              onChange={(e) => onUpdate({ sameContactAsPrimary: e.target.checked })}
              className="accent-primary w-4 h-4"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Same contact info as primary contact</p>
              <p className="text-xs text-gray-500">Use the phone number and address from Section 2</p>
            </div>
          </label>
        )}

        {/* P4: Telephone (show for patient 2+ when not using same contact) */}
        {!isFirstPatient && !data.sameContactAsPrimary && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telephone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formatPhoneInput(data.telephone)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                onUpdate({ telephone: digits });
              }}
              placeholder="(416) 555-0100"
              className={inputCls}
            />
          </div>
        )}

        {/* P5: Address (show for patient 2+ when not using same contact) */}
        {!isFirstPatient && !data.sameContactAsPrimary && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => onUpdate({ address: e.target.value })}
              placeholder="123 Main St"
              className={inputCls}
            />
          </div>
        )}

        {/* P6: Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => onUpdate({ dateOfBirth: e.target.value })}
            className={inputCls}
          />
          <OhipEligibilityNotice dateOfBirth={data.dateOfBirth} healthConditions={data.healthConditions} familyEyeConditions={data.familyEyeConditions} />
        </div>

        {/* P7: Medications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Medications
          </label>
          <textarea
            value={data.medications}
            onChange={(e) => onUpdate({ medications: e.target.value })}
            placeholder="List any medications currently taken (or write 'None')"
            rows={2}
            className={inputCls}
          />
        </div>

        {/* P8: Allergies */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
          <input
            type="text"
            value={data.allergies}
            onChange={(e) => onUpdate({ allergies: e.target.value })}
            placeholder="e.g. Penicillin, Latex, None"
            className={inputCls}
          />
        </div>

        {/* P9: Health Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Do you have any of these health conditions?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HEALTH_CONDITIONS.map((c) => (
              <label
                key={c}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${
                  data.healthConditions.includes(c)
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={data.healthConditions.includes(c)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...data.healthConditions, c]
                      : data.healthConditions.filter((v) => v !== c);
                    onUpdate({ healthConditions: updated });
                  }}
                  className="accent-primary"
                />
                {c}
              </label>
            ))}
          </div>
        </div>

        {/* P10: Family Eye Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Family eye conditions
          </label>
          {!isFirstPatient && (
            <p className="text-xs text-gray-500 mb-2">
              If this person is in the same family as Patient 1, you can select the same answers.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FAMILY_EYE_CONDITIONS.map((c) => (
              <label
                key={c}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${
                  data.familyEyeConditions.includes(c)
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={data.familyEyeConditions.includes(c)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...data.familyEyeConditions, c]
                      : data.familyEyeConditions.filter((v) => v !== c);
                    onUpdate({ familyEyeConditions: updated });
                  }}
                  className="accent-primary"
                />
                {c}
              </label>
            ))}
          </div>
        </div>

        {/* Screen time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Screen time per day
          </label>
          <div className="flex flex-wrap gap-2">
            {SCREEN_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onUpdate({ screenHoursPerDay: opt })}
                className={`px-4 py-2 rounded-xl border-2 text-sm transition-all ${
                  data.screenHoursPerDay === opt
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Currently wear glasses */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Do you currently wear any of these?
          </label>
          <div className="flex flex-wrap gap-2">
            {GLASSES_OPTIONS.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all text-sm ${
                  data.currentlyWearGlasses.includes(opt)
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={data.currentlyWearGlasses.includes(opt)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...data.currentlyWearGlasses, opt]
                      : data.currentlyWearGlasses.filter((v) => v !== opt);
                    onUpdate({ currentlyWearGlasses: updated });
                  }}
                  className="accent-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Eye exam specific fields (P11-P14) */}
        {isEyeExam && (
          <>
            {/* P11: Dilation Preference */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Dilation preference <span className="text-red-500">*</span>
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-xs text-blue-800 font-medium">What is dilation?</p>
                <p className="text-xs text-blue-700">
                  Eye drops are used to widen your pupils so the doctor can see the back of your
                  eye more clearly. Vision may be blurry for 3–4 hours after.
                </p>
                <DilationDiagram />
              </div>
              <div className="space-y-2">
                {DILATION_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      data.dilationPreference === opt
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`dilation-${index}`}
                      checked={data.dilationPreference === opt}
                      onChange={() => onUpdate({ dilationPreference: opt })}
                      className="accent-primary"
                    />
                    <span className="text-sm text-gray-900">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* P12: Main reason for exam */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Main reason for your eye exam? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={data.mainReasonForExam}
                onChange={(e) => onUpdate({ mainReasonForExam: e.target.value })}
                placeholder="e.g. Annual check-up, headaches, blurry vision…"
                rows={2}
                className={inputCls}
              />
            </div>

            {/* P13: Biggest vision annoyance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What is your biggest vision annoyance? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={data.biggestVisionAnnoyance}
                onChange={(e) => onUpdate({ biggestVisionAnnoyance: e.target.value })}
                placeholder="e.g. Trouble reading small text, night driving glare, eye fatigue…"
                rows={2}
                className={inputCls}
              />
            </div>

            {/* P14: Any concerns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Any other concerns for the doctor?
              </label>
              <textarea
                value={data.examConcerns}
                onChange={(e) => onUpdate({ examConcerns: e.target.value })}
                placeholder="Anything else you'd like the doctor to know about…"
                rows={2}
                className={inputCls}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
