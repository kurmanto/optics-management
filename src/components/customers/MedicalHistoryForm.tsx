"use client";

import { useActionState, useState } from "react";
import { saveMedicalHistory, MedicalHistoryFormState } from "@/lib/actions/customers";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

type MedicalHistoryData = {
  eyeConditions: string[];
  systemicConditions: string[];
  medications: string | null;
  allergies: string | null;
  familyGlaucoma: boolean;
  familyAmd: boolean;
  familyHighMyopia: boolean;
  familyColorblind: boolean;
  hadLasik: boolean;
  wearsContacts: boolean;
  contactType: string | null;
  primaryUse: string | null;
  screenTimeDaily: number | null;
  notes: string | null;
};

type Props = {
  customerId: string;
  initialData?: MedicalHistoryData | null;
};

const EYE_CONDITIONS = [
  { value: "MYOPIA", label: "Myopia (nearsighted)" },
  { value: "HYPEROPIA", label: "Hyperopia (farsighted)" },
  { value: "ASTIGMATISM", label: "Astigmatism" },
  { value: "PRESBYOPIA", label: "Presbyopia" },
  { value: "DRY_EYES", label: "Dry Eyes" },
  { value: "GLAUCOMA", label: "Glaucoma" },
  { value: "CATARACTS", label: "Cataracts" },
  { value: "AMD", label: "Macular Degeneration" },
  { value: "DIABETIC_RETINOPATHY", label: "Diabetic Retinopathy" },
];

const SYSTEMIC_CONDITIONS = [
  { value: "DIABETES", label: "Diabetes" },
  { value: "HYPERTENSION", label: "Hypertension" },
  { value: "THYROID", label: "Thyroid" },
  { value: "AUTOIMMUNE", label: "Autoimmune" },
];

export function MedicalHistoryForm({ customerId, initialData }: Props) {
  const [isOpen, setIsOpen] = useState(!!initialData);
  const [wearsContacts, setWearsContacts] = useState(initialData?.wearsContacts ?? false);

  const boundAction = saveMedicalHistory.bind(null, customerId);
  const [state, formAction, isPending] = useActionState<MedicalHistoryFormState, FormData>(
    boundAction,
    {}
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">Medical History</h2>
          {initialData && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3" /> On file
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {isOpen && (
        <form action={formAction} className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {state.error}
            </div>
          )}
          {state.success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              Medical history saved.
            </div>
          )}

          {/* Eye Conditions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Eye Conditions</p>
            <div className="grid grid-cols-2 gap-2">
              {EYE_CONDITIONS.map((c) => (
                <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="eyeConditions"
                    value={c.value}
                    defaultChecked={initialData?.eyeConditions.includes(c.value)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Systemic Conditions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Systemic Conditions</p>
            <div className="grid grid-cols-2 gap-2">
              {SYSTEMIC_CONDITIONS.map((c) => (
                <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="systemicConditions"
                    value={c.value}
                    defaultChecked={initialData?.systemicConditions.includes(c.value)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Family History */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Family History</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="familyGlaucoma" defaultChecked={initialData?.familyGlaucoma} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm text-gray-700">Glaucoma</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="familyAmd" defaultChecked={initialData?.familyAmd} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm text-gray-700">Macular Degeneration</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="familyHighMyopia" defaultChecked={initialData?.familyHighMyopia} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm text-gray-700">High Myopia</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="familyColorblind" defaultChecked={initialData?.familyColorblind} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm text-gray-700">Colour Blindness</span>
              </label>
            </div>
          </div>

          {/* Procedures & Contacts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Procedures</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="hadLasik" defaultChecked={initialData?.hadLasik} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm text-gray-700">Had LASIK / refractive surgery</span>
              </label>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Contact Lenses</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="wearsContacts"
                  defaultChecked={initialData?.wearsContacts}
                  onChange={(e) => setWearsContacts(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Wears contacts</span>
              </label>
              {wearsContacts && (
                <div className="mt-2">
                  <select
                    name="contactType"
                    defaultValue={initialData?.contactType || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="">Type...</option>
                    <option value="SOFT_DAILY">Soft daily</option>
                    <option value="SOFT_BIWEEKLY">Soft bi-weekly</option>
                    <option value="SOFT_MONTHLY">Soft monthly</option>
                    <option value="RGP">RGP / hard</option>
                    <option value="SCLERAL">Scleral</option>
                    <option value="ORTHO_K">Ortho-K</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Primary Use & Screen Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary use of vision</label>
              <select
                name="primaryUse"
                defaultValue={initialData?.primaryUse || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">Not specified</option>
                <option value="DISTANCE">Distance (driving)</option>
                <option value="NEAR">Near (reading)</option>
                <option value="COMPUTER">Computer / digital</option>
                <option value="MIXED">Mixed</option>
                <option value="SPORTS">Sports / outdoor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Screen time (hrs/day)</label>
              <input
                name="screenTimeDaily"
                type="number"
                min="0"
                max="24"
                step="0.5"
                defaultValue={initialData?.screenTimeDaily ?? ""}
                placeholder="e.g. 8"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Medications & Allergies */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
              <textarea
                name="medications"
                defaultValue={initialData?.medications || ""}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="List current medications..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
              <textarea
                name="allergies"
                defaultValue={initialData?.allergies || ""}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Known allergies..."
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
            <textarea
              name="notes"
              defaultValue={initialData?.notes || ""}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
            >
              {isPending ? "Saving..." : "Save Medical History"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
