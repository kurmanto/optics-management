import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { ApplyIntakeButton } from "@/components/forms/ApplyIntakeButton";
import { formatDate } from "@/lib/utils/formatters";
import { ArrowLeft, User, CheckCircle2, Clock, PenLine } from "lucide-react";
import { FormTemplateType } from "@prisma/client";

const TYPE_LABELS: Record<FormTemplateType, string> = {
  NEW_PATIENT: "New Patient Registration",
  HIPAA_CONSENT: "Privacy & Consent",
  FRAME_REPAIR_WAIVER: "Frame Repair Waiver",
  INSURANCE_VERIFICATION: "Insurance Verification",
  UNIFIED_INTAKE: "Unified Intake",
};

// Field ordering per form type for clean display
const FIELD_ORDER: Partial<Record<FormTemplateType, string[]>> = {
  NEW_PATIENT: [
    "firstName", "lastName", "dateOfBirth", "gender",
    "phone", "email",
    "address", "city", "province", "postalCode",
    "notes",
  ],
  HIPAA_CONSENT: ["smsOptIn", "emailOptIn"],
  INSURANCE_VERIFICATION: [
    "insuranceProviderName", "policyNumber", "groupNumber", "memberId",
    "coverageType", "renewalMonth", "renewalYear", "notes",
  ],
};

function humanizeKey(key: string): string {
  const overrides: Record<string, string> = {
    firstName: "First Name",
    lastName: "Last Name",
    dateOfBirth: "Date of Birth",
    phone: "Phone",
    email: "Email",
    address: "Address",
    city: "City",
    province: "Province",
    postalCode: "Postal Code",
    smsOptIn: "SMS Opt-In",
    emailOptIn: "Email Opt-In",
    insuranceProviderName: "Insurance Provider",
    policyNumber: "Policy Number",
    groupNumber: "Group Number",
    memberId: "Member ID",
    coverageType: "Coverage Type",
    renewalMonth: "Renewal Month",
    renewalYear: "Renewal Year",
    notes: "Notes",
    gender: "Gender",
  };
  return overrides[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 sm:w-44 flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{display}</dd>
    </div>
  );
}

type Props = {
  params: Promise<{ packageId: string }>;
};

export default async function IntakeReviewPage({ params }: Props) {
  await verifySession();
  const { packageId } = await params;

  const pkg = await prisma.formPackage.findUnique({
    where: { id: packageId },
    include: {
      submissions: {
        include: { template: true },
        orderBy: { packageOrder: "asc" },
      },
      customer: { select: { id: true, firstName: true, lastName: true } },
      sentBy: { select: { name: true } },
    },
  });

  if (!pkg) notFound();

  const completedCount = pkg.submissions.filter((s) => s.status === "COMPLETED").length;
  const totalCount = pkg.submissions.length;
  const allCompleted = completedCount === totalCount;
  const alreadyApplied = !!pkg.appliedAt;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/forms"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Forms
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Intake Review — {pkg.customerName ?? "New Patient"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sent by {pkg.sentBy?.name ?? "Self-service"} · {formatDate(pkg.createdAt)}
            {" · "}
            {completedCount}/{totalCount} forms completed
          </p>
        </div>
        {alreadyApplied ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            Applied {formatDate(pkg.appliedAt)}
          </span>
        ) : allCompleted ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-700 flex-shrink-0">
            <Clock className="w-4 h-4" />
            Needs Review
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 flex-shrink-0">
            <Clock className="w-4 h-4" />
            In Progress
          </span>
        )}
      </div>

      {/* Linked customer */}
      {pkg.customer && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4 text-gray-400" />
            Linked to patient record
          </div>
          <Link
            href={`/customers/${pkg.customer.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {pkg.customer.firstName} {pkg.customer.lastName} →
          </Link>
        </div>
      )}

      {/* Per-form sections */}
      {pkg.submissions.map((sub) => {
        const data = sub.data as Record<string, unknown> | null;
        const fieldOrder = FIELD_ORDER[sub.template.type];

        // Build ordered + then remaining fields
        let entries: [string, unknown][] = [];
        if (data) {
          if (fieldOrder) {
            const orderedKeys = fieldOrder.filter((k) => k in data);
            const remaining = Object.keys(data).filter((k) => !fieldOrder.includes(k));
            entries = [...orderedKeys, ...remaining].map((k) => [k, data[k]]);
          } else {
            entries = Object.entries(data);
          }
        }

        return (
          <div key={sub.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {TYPE_LABELS[sub.template.type]}
                </span>
                {sub.signatureText && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    <PenLine className="w-3 h-3" /> Signed
                  </span>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  sub.status === "COMPLETED"
                    ? "bg-green-100 text-green-700"
                    : sub.status === "EXPIRED"
                    ? "bg-gray-100 text-gray-500"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {sub.status === "COMPLETED" ? "Completed" : sub.status === "EXPIRED" ? "Expired" : "Pending"}
              </span>
            </div>

            {sub.status === "COMPLETED" && data ? (
              <div className="px-5 py-2">
                <dl>
                  {entries.map(([key, value]) => (
                    <FieldRow key={key} label={humanizeKey(key)} value={value} />
                  ))}
                </dl>

                {sub.signatureText && (
                  <div className="mt-4 mb-3 bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1.5">Electronic Signature</p>
                    {sub.signatureText.startsWith("data:image") ? (
                      <img
                        src={sub.signatureText}
                        alt="Signature"
                        className="max-h-24 object-contain"
                      />
                    ) : (
                      <p className="text-xl font-['Georgia',serif] italic text-gray-800">
                        {sub.signatureText}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">
                      Signed {formatDate(sub.signedAt ?? sub.completedAt)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-sm text-gray-400">
                {sub.status === "PENDING" ? "Waiting for patient to complete this form." : "Form was not completed."}
              </div>
            )}
          </div>
        );
      })}

      {/* Apply to record */}
      {!alreadyApplied && allCompleted && (
        <div className="bg-white rounded-xl border border-primary/20 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Apply to Patient Record</h2>
          <p className="text-sm text-gray-500 mb-4">
            Import all submitted data — registration, consent preferences, and insurance — into the PMS in one click.
          </p>
          <ApplyIntakeButton packageId={pkg.id} customerId={pkg.customerId} />
        </div>
      )}

      {alreadyApplied && (
        <div className="bg-green-50 rounded-xl border border-green-100 p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Intake data applied</p>
            <p className="text-sm text-green-600 mt-0.5">
              All form data was imported to the patient record on {formatDate(pkg.appliedAt)}.
            </p>
            {pkg.customer && (
              <Link
                href={`/customers/${pkg.customer.id}`}
                className="inline-block mt-2 text-sm font-medium text-green-700 hover:underline"
              >
                View patient record →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
