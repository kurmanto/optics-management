"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampaignType } from "@prisma/client";
import { createCampaign } from "@/lib/actions/campaigns";
import { getSegmentPreset } from "@/lib/campaigns/segment-presets";
import { getDripConfig } from "@/lib/campaigns/drip-presets";
import { TEMPLATE_VARIABLES } from "@/lib/campaigns/template-variables";
import { CampaignTypeSelector } from "./CampaignTypeSelector";
import { SegmentPreview } from "./SegmentPreview";
import { TemplateEditor } from "./TemplateEditor";
import { cn } from "@/lib/utils/cn";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import type { SegmentDefinition } from "@/lib/campaigns/segment-types";
import type { DripStep } from "@/lib/campaigns/drip-presets";

const STEPS = ["Type", "Segment", "Template", "Schedule", "Review"];

export function CampaignWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [segmentConfig, setSegmentConfig] = useState<SegmentDefinition | null>(null);
  const [dripSteps, setDripSteps] = useState<DripStep[]>([]);
  const [enrollmentMode, setEnrollmentMode] = useState<"auto" | "manual">("auto");
  const [stopOnConversion, setStopOnConversion] = useState(true);
  const [activateNow, setActivateNow] = useState(false);

  function onSelectType(type: CampaignType) {
    setSelectedType(type);
    const preset = getSegmentPreset(type);
    setSegmentConfig(preset);
    const drip = getDripConfig(type);
    setDripSteps(drip.steps);
    setEnrollmentMode(drip.enrollmentMode);
    setStopOnConversion(drip.stopOnConversion);
    if (!name) {
      setName(TYPE_LABELS[type] ?? type.replace(/_/g, " "));
    }
  }

  function canProceed() {
    if (step === 0) return selectedType !== null;
    if (step === 4) return name.trim().length > 0;
    return true;
  }

  async function handleSubmit(activate: boolean) {
    if (!selectedType || !name.trim()) return;
    setError(null);

    startTransition(async () => {
      const input = {
        name: name.trim(),
        type: selectedType,
        description: description.trim() || undefined,
        segmentConfig: segmentConfig ?? undefined,
        config: {
          steps: dripSteps,
          stopOnConversion,
          cooldownDays: 30,
          enrollmentMode,
        },
      };

      const result = await createCampaign(input);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      if (activate) {
        const { activateCampaign } = await import("@/lib/actions/campaigns");
        await activateCampaign(result.id);
      }

      router.push(`/campaigns/${result.id}`);
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                i < step
                  ? "bg-primary text-white"
                  : i === step
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-500"
              )}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-sm font-medium hidden sm:block",
                i === step ? "text-gray-900" : "text-gray-400"
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn("w-8 h-px mx-1", i < step ? "bg-primary" : "bg-gray-200")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Select campaign type</h2>
            <p className="text-sm text-gray-500 mb-6">
              Each type has pre-built segment targeting and message templates.
            </p>
            <CampaignTypeSelector
              selected={selectedType}
              onSelect={onSelectType}
            />
          </div>
        )}

        {step === 1 && segmentConfig && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Target audience</h2>
            <p className="text-sm text-gray-500 mb-6">
              Pre-filled with smart defaults for {selectedType?.replace(/_/g, " ")}. Preview your audience.
            </p>
            <SegmentPreview segmentConfig={segmentConfig} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Message templates</h2>
              <p className="text-sm text-gray-500 mb-4">
                Customize the messages for each step of this campaign.
              </p>
            </div>
            {dripSteps.map((step_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Step {i + 1}
                  </span>
                  <span className="text-xs text-gray-400">
                    · {step_.channel} · Day {step_.delayDays}
                  </span>
                </div>
                {step_.templateSubject !== undefined && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={step_.templateSubject ?? ""}
                      onChange={(e) => {
                        const updated = [...dripSteps];
                        updated[i] = { ...updated[i], templateSubject: e.target.value };
                        setDripSteps(updated);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}
                <TemplateEditor
                  value={step_.templateBody}
                  onChange={(val) => {
                    const updated = [...dripSteps];
                    updated[i] = { ...updated[i], templateBody: val };
                    setDripSteps(updated);
                  }}
                  variables={TEMPLATE_VARIABLES}
                />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Schedule</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["auto", "manual"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEnrollmentMode(mode)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      enrollmentMode === mode
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <p className="font-medium text-sm text-gray-900 capitalize">{mode}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {mode === "auto"
                        ? "Customers are enrolled automatically when they match the segment."
                        : "Staff manually enroll individual customers."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="stopOnConversion"
                checked={stopOnConversion}
                onChange={(e) => setStopOnConversion(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="stopOnConversion" className="text-sm text-gray-700">
                Stop messaging once customer converts (places an order)
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Review & launch</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Annual Exam Reminder 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Internal notes about this campaign..."
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
              <p><strong>Type:</strong> {selectedType?.replace(/_/g, " ")}</p>
              <p><strong>Steps:</strong> {dripSteps.length} message{dripSteps.length !== 1 ? "s" : ""}</p>
              <p><strong>Enrollment:</strong> {enrollmentMode}</p>
              <p><strong>Stop on conversion:</strong> {stopOnConversion ? "Yes" : "No"}</p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isPending || !name.trim()}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isPending || !name.trim()}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Creating..." : "Activate Campaign"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 disabled:opacity-40 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

const TYPE_LABELS: Partial<Record<CampaignType, string>> = {
  EXAM_REMINDER: "Annual Exam Reminder",
  WALKIN_FOLLOWUP: "Walk-in Follow-up",
  INSURANCE_RENEWAL: "Insurance Renewal",
  ONE_TIME_BLAST: "One-time Blast",
  SECOND_PAIR: "Second Pair Offer",
  PRESCRIPTION_EXPIRY: "Rx Expiry Reminder",
  ABANDONMENT_RECOVERY: "Abandonment Recovery",
  FAMILY_ADDON: "Family Add-on",
  INSURANCE_MAXIMIZATION: "Insurance Maximization",
  POST_PURCHASE_REFERRAL: "Post-Purchase Referral",
  VIP_INSIDER: "VIP Insider",
  DAMAGE_REPLACEMENT: "Damage Replacement",
  STYLE_EVOLUTION: "Style Evolution",
  BIRTHDAY_ANNIVERSARY: "Birthday Campaign",
  DORMANT_REACTIVATION: "Dormant Reactivation",
  COMPETITOR_SWITCHER: "Competitor Switcher",
  LIFESTYLE_MARKETING: "Lifestyle Marketing",
  AGING_INVENTORY: "Aging Inventory Clearance",
  NEW_ARRIVAL_VIP: "New Arrival VIP Preview",
  EDUCATIONAL_NURTURE: "Educational Nurture",
  LENS_EDUCATION: "Lens Education",
};
