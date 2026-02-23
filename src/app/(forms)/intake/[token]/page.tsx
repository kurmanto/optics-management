import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NewPatientForm } from "@/components/forms/public/NewPatientForm";
import { HipaaConsentForm } from "@/components/forms/public/HipaaConsentForm";
import { InsuranceVerificationForm } from "@/components/forms/public/InsuranceVerificationForm";
import { FormTemplateType } from "@prisma/client";
import Link from "next/link";
import type { ReturningPatientPrefill } from "@/lib/types/forms";

const STEP_LABELS: Record<FormTemplateType, string> = {
  NEW_PATIENT: "New Patient Registration",
  HIPAA_CONSENT: "Privacy & Consent",
  INSURANCE_VERIFICATION: "Insurance Verification",
  FRAME_REPAIR_WAIVER: "Frame Repair Waiver",
};

const STEP_DESCRIPTIONS: Record<FormTemplateType, string> = {
  NEW_PATIENT: "Please complete your personal details so we can set up your patient record.",
  HIPAA_CONSENT: "Please review and sign our privacy consent form.",
  INSURANCE_VERIFICATION: "Please provide your insurance details so we can process your benefits.",
  FRAME_REPAIR_WAIVER: "",
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ handoff?: string }>;
};

export default async function IntakePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { handoff } = await searchParams;
  const isHandoff = handoff === "1";

  const pkg = await prisma.formPackage.findUnique({
    where: { token },
    include: {
      submissions: {
        include: { template: true },
        orderBy: { packageOrder: "asc" },
      },
    },
  });

  if (!pkg) notFound();

  const totalSteps = pkg.submissions.length;
  const completedSteps = pkg.submissions.filter((s) => s.status === "COMPLETED").length;
  const currentSubmission = pkg.submissions.find((s) => s.status === "PENDING");

  // All done
  if (!currentSubmission || pkg.status === "COMPLETED") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-green-600"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">All Done!</h1>
          <p className="text-sm text-gray-500">
            Thank you{pkg.customerName ? `, ${pkg.customerName.split(" ")[0]}` : ""}! Your intake
            forms have been received securely by Mint Vision Optique.
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p>You may now hand the device back to staff.</p>
          <p className="mt-1 text-xs text-gray-400">
            Our team will review your information before your appointment.
          </p>
        </div>
      </div>
    );
  }

  // Handoff screen — shown when staff opens the link in-person before handing to patient
  if (isHandoff) {
    const firstName = pkg.customerName?.split(" ")[0] ?? null;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
        {/* Logo / brand */}
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="text-gray-500">
            Mint Vision Optique has prepared your new patient intake forms.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            This will take about 3–5 minutes. Your information is stored securely.
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-left text-sm text-gray-600 w-full max-w-sm space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">You'll complete</p>
          {pkg.submissions.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span>{STEP_LABELS[s.template.type]}</span>
            </div>
          ))}
        </div>

        <Link
          href={`/intake/${token}`}
          className="w-full max-w-sm flex items-center justify-center py-4 bg-primary text-white text-base font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
        >
          Begin →
        </Link>

        <p className="text-xs text-gray-400">
          Tap &ldquo;Begin&rdquo; to start your forms
        </p>
      </div>
    );
  }

  const type = currentSubmission.template.type;
  const stepNumber = (currentSubmission.packageOrder ?? 0) + 1;
  const completedNewPatient = pkg.submissions.find(
    (s) => s.template.type === "NEW_PATIENT" && s.status === "COMPLETED"
  );
  const prefillName =
    completedNewPatient
      ? `${(completedNewPatient.data as Record<string, string> | null)?.firstName ?? ""} ${(completedNewPatient.data as Record<string, string> | null)?.lastName ?? ""}`.trim()
      : (pkg.customerName ?? undefined);

  const redirectUrl = `/intake/${token}`;

  // Fetch prefill data for returning patients (customerId already linked)
  let prefillData: ReturningPatientPrefill | null = null;
  let prefillInsurance: { providerName: string; policyNumber: string | null; groupNumber: string | null; memberId: string | null; coverageType: string } | null = null;

  if (pkg.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: pkg.customerId },
      include: {
        insurancePolicies: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (customer) {
      const ins = customer.insurancePolicies[0] ?? null;
      prefillData = {
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        dateOfBirth: customer.dateOfBirth?.toISOString().split("T")[0] ?? null,
        gender: customer.gender,
        address: customer.address,
        city: customer.city,
        province: customer.province,
        postalCode: customer.postalCode,
        occupation: customer.occupation,
        hearAboutUs: customer.hearAboutUs,
        insurance: ins
          ? {
              providerName: ins.providerName,
              policyNumber: ins.policyNumber,
              groupNumber: ins.groupNumber,
              memberId: ins.memberId,
              coverageType: ins.coverageType,
            }
          : null,
      };
      prefillInsurance = prefillData.insurance;
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Step {stepNumber} of {totalSteps}
          </p>
          <p className="text-xs text-gray-400">
            {completedSteps} of {totalSteps} completed
          </p>
        </div>
        <div className="flex gap-1.5">
          {pkg.submissions.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s.status === "COMPLETED"
                  ? "bg-primary"
                  : i === stepNumber - 1
                  ? "bg-primary/40"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step title */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{STEP_LABELS[type]}</h1>
        <p className="text-sm text-gray-500 mt-1">{STEP_DESCRIPTIONS[type]}</p>
        {prefillName && (
          <p className="text-sm text-primary mt-2 font-medium">Form for: {prefillName}</p>
        )}
      </div>

      {/* Form */}
      {type === "NEW_PATIENT" && (
        <NewPatientForm
          token={currentSubmission.token}
          prefillName={pkg.customerName}
          prefillData={prefillData}
          packageToken={token}
          redirectUrl={redirectUrl}
        />
      )}
      {type === "HIPAA_CONSENT" && (
        <HipaaConsentForm
          token={currentSubmission.token}
          prefillName={prefillName}
          packageToken={token}
          redirectUrl={redirectUrl}
        />
      )}
      {type === "INSURANCE_VERIFICATION" && (
        <InsuranceVerificationForm
          token={currentSubmission.token}
          prefillName={prefillName}
          prefillInsurance={prefillInsurance}
          packageToken={token}
          redirectUrl={redirectUrl}
        />
      )}
    </div>
  );
}
