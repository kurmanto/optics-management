"use client";

import { useState } from "react";
import Link from "next/link";
import { FormTemplateType, FormStatus, PackageStatus } from "@prisma/client";
import { FormTemplateCard } from "./FormTemplateCard";
import { SendFormModal } from "./SendFormModal";
import { IntakePackageModal } from "./IntakePackageModal";
import { InPersonIntakeButton } from "./InPersonIntakeButton";
import { OutstandingFormRow } from "./OutstandingFormRow";
import { formatDate } from "@/lib/utils/formatters";
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Search, PenLine, FileText, ClipboardCheck } from "lucide-react";

type Template = {
  id: string;
  type: FormTemplateType;
  name: string;
  description: string | null;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
};

type Submission = {
  id: string;
  token: string;
  customerName: string | null;
  status: FormStatus;
  createdAt: Date;
  completedAt: Date | null;
  template: { type: FormTemplateType; name: string };
};

type CompletedSubmission = {
  id: string;
  customerName: string | null;
  completedAt: Date | null;
  signatureText: string | null;
  template: { type: FormTemplateType; name: string };
  customer: { id: string } | null;
};

type IntakePackage = {
  id: string;
  token: string;
  customerName: string | null;
  customerEmail: string | null;
  status: PackageStatus;
  createdAt: Date;
  completedAt: Date | null;
  appliedAt: Date | null;
  submissions: { status: FormStatus; template: { type: FormTemplateType } }[];
};

type Props = {
  templates: Template[];
  recentSubmissions: Submission[];
  completedSubmissions: CompletedSubmission[];
  outstandingSubmissions: Submission[];
  customers: Customer[];
  intakePackages: IntakePackage[];
  baseUrl: string;
};

const STATUS_BADGE: Record<FormStatus, { label: string; class: string }> = {
  PENDING: { label: "Pending", class: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", class: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expired", class: "bg-gray-100 text-gray-600" },
};

const PACKAGE_STATUS_ICON: Record<PackageStatus, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4 text-amber-500" />,
  IN_PROGRESS: <AlertCircle className="w-4 h-4 text-blue-500" />,
  COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

const TEMPLATE_SHORT: Record<FormTemplateType, string> = {
  NEW_PATIENT: "Registration",
  HIPAA_CONSENT: "Privacy",
  INSURANCE_VERIFICATION: "Insurance",
  FRAME_REPAIR_WAIVER: "Waiver",
};

const FORM_TYPE_LABELS: Record<FormTemplateType, string> = {
  NEW_PATIENT: "New Patient Registration",
  HIPAA_CONSENT: "Privacy & Consent",
  FRAME_REPAIR_WAIVER: "Frame Repair Waiver",
  INSURANCE_VERIFICATION: "Insurance Verification",
};

export function FormsHub({
  templates,
  recentSubmissions,
  completedSubmissions,
  outstandingSubmissions,
  customers,
  intakePackages,
  baseUrl,
}: Props) {
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [signedSearch, setSignedSearch] = useState("");
  const [signedTypeFilter, setSignedTypeFilter] = useState<FormTemplateType | "">("");

  const filteredCompleted = completedSubmissions.filter((s) => {
    const q = signedSearch.toLowerCase();
    const matchesName = !q || (s.customerName ?? "").toLowerCase().includes(q);
    const matchesType = !signedTypeFilter || s.template.type === signedTypeFilter;
    return matchesName && matchesType;
  });

  return (
    <>
      {/* New Client Intake CTA */}
      <section className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">New Client Intake</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Send all 3 onboarding forms in one link — Registration, Privacy Consent, and
              Insurance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <InPersonIntakeButton customers={customers} baseUrl={baseUrl} />
          <button
            onClick={() => setShowIntakeModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Send Intake Package
          </button>
        </div>
      </section>

      {/* Intake Packages */}
      {intakePackages.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Intake Packages
            </h2>
            <span className="text-xs text-gray-400">
              {intakePackages.filter((p) => p.status !== "COMPLETED").length} active
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
            {intakePackages.map((pkg) => {
              const completedCount = pkg.submissions.filter(
                (s) => s.status === "COMPLETED"
              ).length;
              const totalCount = pkg.submissions.length;
              const intakeUrl = `${baseUrl}/intake/${pkg.token}`;

              return (
                <div key={pkg.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-shrink-0">{PACKAGE_STATUS_ICON[pkg.status]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {pkg.customerName ?? "New Patient"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-1">
                        {pkg.submissions.map((s, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              s.status === "COMPLETED"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {TEMPLATE_SHORT[s.template.type]}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {completedCount}/{totalCount} · {formatDate(pkg.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pkg.status !== "COMPLETED" && (
                      <button
                        onClick={() => navigator.clipboard.writeText(intakeUrl)}
                        className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Copy intake link"
                      >
                        Copy Link
                      </button>
                    )}
                    {pkg.customerEmail && pkg.status !== "COMPLETED" && (
                      <a
                        href={`mailto:${pkg.customerEmail}?subject=${encodeURIComponent("Your New Patient Forms — Mint Vision Optique")}&body=${encodeURIComponent(`Hi ${(pkg.customerName ?? "").split(" ")[0] || "there"},\n\nPlease complete your intake forms:\n\n${intakeUrl}\n\nThank you!\nMint Vision Optique`)}`}
                        className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Email
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Needs Review */}
      {(() => {
        const needsReview = intakePackages.filter(
          (p) => p.status === "COMPLETED" && !p.appliedAt
        );
        if (needsReview.length === 0) return null;
        return (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4" />
                Needs Review
              </h2>
              <span className="text-xs text-amber-500">{needsReview.length} ready to apply</span>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm divide-y divide-gray-100">
              {needsReview.map((pkg) => (
                <div key={pkg.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {pkg.customerName ?? "New Patient"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      All {pkg.submissions.length} forms completed · {pkg.completedAt ? formatDate(pkg.completedAt) : formatDate(pkg.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={`/forms/review/${pkg.id}`}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    Review →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Templates */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Individual Forms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((t) => (
            <FormTemplateCard key={t.id} template={t} onSend={setActiveTemplate} />
          ))}
        </div>
      </section>

      {/* Outstanding */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Outstanding Forms
          </h2>
          <span className="text-xs text-gray-400">{outstandingSubmissions.length} pending</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {outstandingSubmissions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No outstanding forms — great work!
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {outstandingSubmissions.map((s) => (
                <OutstandingFormRow key={s.id} submission={s} baseUrl={baseUrl} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Signed / Completed Forms */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Completed Forms
          </h2>
          <span className="text-xs text-gray-400">
            {completedSubmissions.filter((s) => s.signatureText).length} signed ·{" "}
            {completedSubmissions.length} total
          </span>
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={signedSearch}
              onChange={(e) => setSignedSearch(e.target.value)}
              placeholder="Search by patient name…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={signedTypeFilter}
            onChange={(e) => setSignedTypeFilter(e.target.value as FormTemplateType | "")}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All types</option>
            {Object.entries(FORM_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {filteredCompleted.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {completedSubmissions.length === 0 ? "No completed forms yet." : "No forms match your search."}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCompleted.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      s.signatureText ? "bg-purple-100" : "bg-green-100"
                    }`}>
                      {s.signatureText
                        ? <PenLine className="w-4 h-4 text-purple-600" />
                        : <FileText className="w-4 h-4 text-green-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.customerName ?? "Anonymous"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {FORM_TYPE_LABELS[s.template.type]} ·{" "}
                        {s.completedAt ? formatDate(s.completedAt) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.signatureText && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <PenLine className="w-3 h-3" /> Signed
                      </span>
                    )}
                    {s.customer && (
                      <Link
                        href={`/customers/${s.customer.id}`}
                        className="px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Patient
                      </Link>
                    )}
                    <Link
                      href={`/forms/${s.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      View Form
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {activeTemplate && (
        <SendFormModal
          template={activeTemplate}
          customers={customers}
          baseUrl={baseUrl}
          onClose={() => setActiveTemplate(null)}
        />
      )}
      {showIntakeModal && (
        <IntakePackageModal
          customers={customers}
          baseUrl={baseUrl}
          onClose={() => setShowIntakeModal(false)}
        />
      )}
    </>
  );
}
