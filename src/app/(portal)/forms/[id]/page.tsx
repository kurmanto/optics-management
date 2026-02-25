import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { AutoPopulateButton } from "@/components/forms/AutoPopulateButton";
import { formatDate } from "@/lib/utils/formatters";
import { ArrowLeft, User } from "lucide-react";
import { FormTemplateType } from "@prisma/client";
import type { IntakeFormState } from "@/lib/types/unified-intake";

const TYPE_LABELS: Record<FormTemplateType, string> = {
  NEW_PATIENT: "New Patient Registration",
  HIPAA_CONSENT: "Privacy & Consent",
  FRAME_REPAIR_WAIVER: "Frame Repair Waiver",
  INSURANCE_VERIFICATION: "Insurance Verification",
  UNIFIED_INTAKE: "Unified Intake Form",
};

const STATUS_BADGE = {
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  EXPIRED: "bg-gray-100 text-gray-600",
};

type Props = {
  params: Promise<{ id: string }>;
};

function FieldRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  const display =
    typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : Array.isArray(value)
      ? value.join(", ")
      : String(value);
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 sm:w-48 flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{display}</dd>
    </div>
  );
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function UnifiedIntakeReview({ data }: { data: IntakeFormState }) {
  return (
    <div className="space-y-6">
      {/* Check-In Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Check-In</h2>
        <dl>
          <FieldRow label="Visit Type" value={data.visitType === "COMPLETE_EYE_EXAM" ? "Complete Eye Exam" : "Eyewear Only"} />
          <FieldRow label="New or Returning" value={data.newOrReturning === "NEW" ? "New Patient" : "Returning Patient"} />
          <FieldRow label="Who Is This For" value={data.whoIsThisFor} />
          <FieldRow label="Patient Count" value={data.patientCount} />
          {data.visionInsurance && <FieldRow label="Vision Insurance" value={data.visionInsurance} />}
          <FieldRow label="Heard About Us" value={data.hearAboutUs} />
        </dl>
      </div>

      {/* Contact Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Primary Contact</h2>
        <dl>
          <FieldRow label="Full Name" value={data.contactFullName} />
          <FieldRow label="Telephone" value={data.contactTelephone} />
          <FieldRow label="Address" value={data.contactAddress} />
          <FieldRow label="City" value={data.contactCity} />
          <FieldRow label="Email" value={data.contactEmail} />
        </dl>
      </div>

      {/* Patients */}
      {data.patients.map((patient, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Patient {i + 1}: {patient.fullName || "—"}
          </h2>
          <dl>
            <FieldRow label="Full Name" value={patient.fullName} />
            <FieldRow label="Gender" value={patient.gender} />
            <FieldRow label="Date of Birth" value={patient.dateOfBirth} />
            {i > 0 && <FieldRow label="Same Contact as Primary" value={patient.sameContactAsPrimary} />}
            {!patient.sameContactAsPrimary && i > 0 && (
              <>
                <FieldRow label="Telephone" value={patient.telephone} />
                <FieldRow label="Address" value={patient.address} />
              </>
            )}
            <FieldRow label="Medications" value={patient.medications} />
            <FieldRow label="Allergies" value={patient.allergies} />
            <FieldRow label="Health Conditions" value={patient.healthConditions} />
            <FieldRow label="Family Eye Conditions" value={patient.familyEyeConditions} />
            <FieldRow label="Screen Hours/Day" value={patient.screenHoursPerDay} />
            <FieldRow label="Currently Wears" value={patient.currentlyWearGlasses} />
            {data.visitType === "COMPLETE_EYE_EXAM" && (
              <>
                <FieldRow label="Dilation Preference" value={patient.dilationPreference} />
                <FieldRow label="Main Reason for Exam" value={patient.mainReasonForExam} />
                <FieldRow label="Biggest Vision Annoyance" value={patient.biggestVisionAnnoyance} />
                <FieldRow label="Exam Concerns" value={patient.examConcerns} />
              </>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}

export default async function FormSubmissionDetailPage({ params }: Props) {
  await verifySession();
  const { id } = await params;

  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    include: {
      template: true,
      customer: { select: { id: true, firstName: true, lastName: true } },
      sentBy: { select: { name: true } },
    },
  });

  if (!submission) notFound();

  const data = submission.data as Record<string, unknown> | null;
  const isUnified = submission.template.type === "UNIFIED_INTAKE";

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {TYPE_LABELS[submission.template.type]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sent by {submission.sentBy?.name ?? "Self-service"} · {formatDate(submission.createdAt)}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[submission.status]}`}
        >
          {submission.status}
        </span>
      </div>

      {/* Meta */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <dl className="divide-y divide-gray-100">
          <FieldRow label="Patient" value={submission.customerName ?? "—"} />
          {submission.customer && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100">
              <dt className="text-sm text-gray-500 sm:w-48 flex-shrink-0">Customer Record</dt>
              <dd>
                <Link
                  href={`/customers/${submission.customer.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                >
                  <User className="w-3.5 h-3.5" />
                  {submission.customer.firstName} {submission.customer.lastName}
                </Link>
              </dd>
            </div>
          )}
          <FieldRow label="Sent" value={formatDate(submission.createdAt)} />
          {submission.completedAt && (
            <FieldRow label="Completed" value={formatDate(submission.completedAt)} />
          )}
        </dl>
      </div>

      {/* Form Data */}
      {submission.status === "COMPLETED" && data && (
        isUnified ? (
          <UnifiedIntakeReview data={data as unknown as IntakeFormState} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Submitted Information</h2>
            <dl>
              {Object.entries(data).map(([key, value]) => (
                <FieldRow key={key} label={humanizeKey(key)} value={value} />
              ))}
            </dl>
          </div>
        )
      )}

      {/* Signature */}
      {submission.signatureText && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Electronic Signature</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            {submission.signatureText.startsWith("data:image") ? (
              <img
                src={submission.signatureText}
                alt="Signature"
                className="max-h-24 object-contain"
                style={{ filter: "invert(0)" }}
              />
            ) : (
              <p className="text-xl font-['Georgia',serif] italic text-gray-800">
                {submission.signatureText}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Signed on {formatDate(submission.signedAt ?? submission.completedAt)}
            </p>
          </div>
        </div>
      )}

      {/* Auto-populate — only for non-unified legacy submissions */}
      {submission.status === "COMPLETED" && !isUnified && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Apply to Patient Record</h2>
          <p className="text-sm text-gray-500 mb-4">
            Import the submitted data into the PMS customer record.
          </p>
          <AutoPopulateButton submissionId={submission.id} />
        </div>
      )}
    </div>
  );
}
