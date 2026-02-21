"use client";

import { useState, useTransition } from "react";
import { Plus, ChevronDown, ChevronUp, X, Shield, Edit2 } from "lucide-react";
import { addInsurancePolicy, updateInsurancePolicy, deactivateInsurancePolicy } from "@/lib/actions/insurance";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

type Policy = {
  id: string;
  providerName: string;
  policyNumber: string | null;
  groupNumber: string | null;
  memberId: string | null;
  coverageType: string;
  contractNumber: string | null;
  estimatedCoverage: number | null;
  maxFrames: number | null;
  maxLenses: number | null;
  maxContacts: number | null;
  maxExam: number | null;
  lastClaimDate: Date | null;
  eligibilityIntervalMonths: number;
  notes: string | null;
  isActive: boolean;
};

type Props = {
  customerId: string;
  initialPolicies: Policy[];
};

const COVERAGE_TYPES = [
  { value: "VISION", label: "Vision" },
  { value: "OHIP", label: "OHIP" },
  { value: "EXTENDED_HEALTH", label: "Extended Health" },
  { value: "COMBINED", label: "Combined" },
];

const COMMON_PROVIDERS = [
  "Sun Life",
  "Manulife",
  "Great-West Life",
  "Blue Cross",
  "Green Shield",
  "OHIP",
  "Desjardins",
  "Industrial Alliance",
  "Chambers of Commerce",
  "Johnston Group",
];

function computeNextEligible(lastClaimDate: Date | null, intervalMonths: number): string | null {
  if (!lastClaimDate) return null;
  const next = new Date(lastClaimDate);
  next.setMonth(next.getMonth() + intervalMonths);
  return next.toISOString().slice(0, 10);
}

function isEligibleNow(lastClaimDate: Date | null, intervalMonths: number): boolean {
  if (!lastClaimDate) return true;
  const next = new Date(lastClaimDate);
  next.setMonth(next.getMonth() + intervalMonths);
  return next <= new Date();
}

function PolicyForm({
  initial,
  customerId,
  policyId,
  onDone,
}: {
  initial?: Partial<Policy>;
  customerId: string;
  policyId?: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [providerInput, setProviderInput] = useState(initial?.providerName || "");
  const [showCustomProvider, setShowCustomProvider] = useState(
    !!initial?.providerName && !COMMON_PROVIDERS.includes(initial.providerName)
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const str = (name: string) => (fd.get(name) as string | null) ?? undefined;
    const data = {
      providerName: showCustomProvider ? (fd.get("customProvider") as string) : providerInput,
      policyNumber: str("policyNumber") || undefined,
      groupNumber: str("groupNumber") || undefined,
      memberId: str("memberId") || undefined,
      coverageType: fd.get("coverageType") as string,
      contractNumber: str("contractNumber") || undefined,
      estimatedCoverage: fd.get("estimatedCoverage") ? parseFloat(fd.get("estimatedCoverage") as string) : undefined,
      maxFrames: fd.get("maxFrames") ? parseFloat(fd.get("maxFrames") as string) : undefined,
      maxLenses: fd.get("maxLenses") ? parseFloat(fd.get("maxLenses") as string) : undefined,
      maxExam: fd.get("maxExam") ? parseFloat(fd.get("maxExam") as string) : undefined,
      lastClaimDate: str("lastClaimDate") || undefined,
      eligibilityIntervalMonths: parseInt(fd.get("eligibilityIntervalMonths") as string) || 24,
      notes: str("notes") || undefined,
    };

    setError("");
    startTransition(async () => {
      const result = policyId
        ? await updateInsurancePolicy(policyId, data)
        : await addInsurancePolicy(customerId, data);
      if ("error" in result) {
        setError(result.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
          {!showCustomProvider ? (
            <div className="flex gap-2">
              <select
                value={providerInput}
                onChange={(e) => setProviderInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">Select provider...</option>
                {COMMON_PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCustomProvider(true)}
                className="text-xs text-primary hover:underline whitespace-nowrap"
              >
                + Other
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                name="customProvider"
                defaultValue={!COMMON_PROVIDERS.includes(providerInput) ? providerInput : ""}
                placeholder="Enter provider name"
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowCustomProvider(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                Use list
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Coverage Type</label>
          <select
            name="coverageType"
            defaultValue={initial?.coverageType || "VISION"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {COVERAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Policy Number</label>
          <input name="policyNumber" defaultValue={initial?.policyNumber || ""} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Member ID</label>
          <input name="memberId" defaultValue={initial?.memberId || ""} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contract Number</label>
          <input name="contractNumber" defaultValue={initial?.contractNumber || ""} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Est. Coverage ($)</label>
          <input type="number" min="0" step="0.01" name="estimatedCoverage" defaultValue={initial?.estimatedCoverage ?? ""} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max Frames ($)</label>
          <input type="number" min="0" step="0.01" name="maxFrames" defaultValue={initial?.maxFrames ?? ""} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max Lenses ($)</label>
          <input type="number" min="0" step="0.01" name="maxLenses" defaultValue={initial?.maxLenses ?? ""} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max Exam ($)</label>
          <input type="number" min="0" step="0.01" name="maxExam" defaultValue={initial?.maxExam ?? ""} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Last Claim Date</label>
          <input type="date" name="lastClaimDate" defaultValue={initial?.lastClaimDate ? new Date(initial.lastClaimDate).toISOString().slice(0, 10) : ""} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Eligibility Interval (months)</label>
          <input type="number" min="1" name="eligibilityIntervalMonths" defaultValue={initial?.eligibilityIntervalMonths ?? 24} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" defaultValue={initial?.notes || ""} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {pending ? "Saving..." : policyId ? "Update Policy" : "Add Policy"}
        </button>
      </div>
    </form>
  );
}

function PolicyCard({ policy, customerId }: { policy: Policy; customerId: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const nextEligible = computeNextEligible(policy.lastClaimDate, policy.eligibilityIntervalMonths);
  const eligible = isEligibleNow(policy.lastClaimDate, policy.eligibilityIntervalMonths);

  if (editing) {
    return <PolicyForm initial={policy} customerId={customerId} policyId={policy.id} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${eligible ? "text-green-600" : "text-amber-500"}`} />
          <div>
            <p className="font-semibold text-gray-900">{policy.providerName}</p>
            <p className="text-xs text-gray-500">{COVERAGE_TYPES.find(t => t.value === policy.coverageType)?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eligible ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-700"}`}>
            {eligible ? "Eligible Now" : "Not Yet Eligible"}
          </span>
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => startTransition(async () => { await deactivateInsurancePolicy(policy.id); })}
            disabled={pending}
            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
        {policy.policyNumber && <span>Policy: <strong>{policy.policyNumber}</strong></span>}
        {policy.memberId && <span>Member ID: <strong>{policy.memberId}</strong></span>}
        {policy.contractNumber && <span>Contract: <strong>{policy.contractNumber}</strong></span>}
        {policy.estimatedCoverage != null && (
          <span>Est. Coverage: <strong>{formatCurrency(policy.estimatedCoverage)}</strong></span>
        )}
        {policy.maxFrames != null && <span>Frames: <strong>{formatCurrency(policy.maxFrames)}</strong></span>}
        {policy.maxLenses != null && <span>Lenses: <strong>{formatCurrency(policy.maxLenses)}</strong></span>}
        {policy.maxExam != null && <span>Exam: <strong>{formatCurrency(policy.maxExam)}</strong></span>}
        {policy.lastClaimDate && (
          <span>Last Claim: <strong>{formatDate(policy.lastClaimDate)}</strong></span>
        )}
        {nextEligible && (
          <span className={eligible ? "text-green-700" : "text-amber-700"}>
            Next Eligible: <strong>{new Date(nextEligible).toLocaleDateString("en-CA")}</strong>
          </span>
        )}
      </div>

      {policy.notes && <p className="text-xs text-gray-500 italic">{policy.notes}</p>}
    </div>
  );
}

export function InsurancePolicyManager({ customerId, initialPolicies }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const activePolicies = initialPolicies.filter((p) => p.isActive);

  return (
    <div className="space-y-3">
      {activePolicies.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-400 text-center py-4">No insurance policies on file.</p>
      )}

      {activePolicies.map((p) => (
        <PolicyCard key={p.id} policy={p} customerId={customerId} />
      ))}

      {showAddForm ? (
        <PolicyForm customerId={customerId} onDone={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Insurance Policy
        </button>
      )}
    </div>
  );
}
