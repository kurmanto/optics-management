"use client";

import { FileText, UserPlus, Shield, Wrench, CreditCard } from "lucide-react";
import { FormTemplateType } from "@prisma/client";

const TYPE_META: Record<FormTemplateType, { label: string; description: string; icon: React.ElementType; color: string }> = {
  NEW_PATIENT: {
    label: "New Patient Registration",
    description: "Collect personal details, contact info, and health card number for new patients.",
    icon: UserPlus,
    color: "bg-blue-50 text-blue-600",
  },
  HIPAA_CONSENT: {
    label: "Privacy & Consent (PIPEDA)",
    description: "Obtain consent for data collection, SMS/email communications, and insurance sharing.",
    icon: Shield,
    color: "bg-green-50 text-green-600",
  },
  FRAME_REPAIR_WAIVER: {
    label: "Frame Repair Waiver",
    description: "Liability waiver for frame adjustments and repairs with patient signature.",
    icon: Wrench,
    color: "bg-amber-50 text-amber-600",
  },
  INSURANCE_VERIFICATION: {
    label: "Insurance Verification",
    description: "Collect policy details, member ID, group number, and renewal dates.",
    icon: CreditCard,
    color: "bg-purple-50 text-purple-600",
  },
};

type Template = {
  id: string;
  type: FormTemplateType;
  name: string;
  description: string | null;
};

type Props = {
  template: Template;
  onSend: (template: Template) => void;
};

export function FormTemplateCard({ template, onSend }: Props) {
  const meta = TYPE_META[template.type];
  const Icon = meta?.icon ?? FileText;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta?.color ?? "bg-gray-50 text-gray-500"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-gray-900 text-sm">{meta?.label ?? template.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            {meta?.description ?? template.description}
          </p>
        </div>
      </div>
      <button
        onClick={() => onSend(template)}
        className="w-full py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
      >
        Quick Send
      </button>
    </div>
  );
}
