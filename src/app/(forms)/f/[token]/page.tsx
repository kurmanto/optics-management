import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NewPatientForm } from "@/components/forms/public/NewPatientForm";
import { HipaaConsentForm } from "@/components/forms/public/HipaaConsentForm";
import { FrameRepairWaiverForm } from "@/components/forms/public/FrameRepairWaiverForm";
import { InsuranceVerificationForm } from "@/components/forms/public/InsuranceVerificationForm";

const FORM_TITLES: Record<string, string> = {
  NEW_PATIENT: "New Patient Registration",
  HIPAA_CONSENT: "Privacy & Consent Form",
  FRAME_REPAIR_WAIVER: "Frame Repair Waiver",
  INSURANCE_VERIFICATION: "Insurance Verification",
};

const FORM_DESCRIPTIONS: Record<string, string> = {
  NEW_PATIENT: "Please complete all fields to register as a new patient at Mint Vision Optique.",
  HIPAA_CONSENT: "Please review and sign our privacy consent form.",
  FRAME_REPAIR_WAIVER: "Please read and sign this waiver before we proceed with your frame repair.",
  INSURANCE_VERIFICATION: "Please provide your insurance information so we can verify your coverage.",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PublicFormPage({ params }: Props) {
  const { token } = await params;

  const submission = await prisma.formSubmission.findUnique({
    where: { token },
    include: { template: true },
  });

  if (!submission) {
    notFound();
  }

  if (submission.status === "COMPLETED") {
    redirect(`/f/${token}/success`);
  }

  if (
    submission.status === "EXPIRED" ||
    (submission.expiresAt && new Date() > submission.expiresAt)
  ) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-gray-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Form Link Expired</h1>
        <p className="text-sm text-gray-500">
          This form link has expired. Please contact the clinic for a new link.
        </p>
      </div>
    );
  }

  const type = submission.template.type;
  const title = FORM_TITLES[type] ?? "Patient Form";
  const description = FORM_DESCRIPTIONS[type] ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
        {submission.customerName && (
          <p className="text-sm text-primary mt-2 font-medium">
            Form for: {submission.customerName}
          </p>
        )}
      </div>

      {type === "NEW_PATIENT" && (
        <NewPatientForm token={token} prefillName={submission.customerName} />
      )}
      {type === "HIPAA_CONSENT" && (
        <HipaaConsentForm token={token} prefillName={submission.customerName} />
      )}
      {type === "FRAME_REPAIR_WAIVER" && (
        <FrameRepairWaiverForm token={token} prefillName={submission.customerName} />
      )}
      {type === "INSURANCE_VERIFICATION" && (
        <InsuranceVerificationForm token={token} prefillName={submission.customerName} />
      )}
    </div>
  );
}
