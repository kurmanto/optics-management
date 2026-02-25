"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { CreateFormSubmissionSchema } from "@/lib/validations/forms";
import { FormTemplateType, Gender } from "@prisma/client";
import { createNotification } from "@/lib/notifications";

export type FormActionState = {
  error?: string;
  submissionId?: string;
  token?: string;
};

// ─── Staff Actions ──────────────────────────────────────────────────────────

export async function createFormSubmission(
  prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await verifyRole("STAFF");

  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateFormSubmissionSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }

  const { templateId, customerId, customerName, expiresAt } = parsed.data;

  // Resolve customer name if not provided but customerId is
  let resolvedName = customerName;
  if (!resolvedName && customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true },
    });
    if (customer) {
      resolvedName = `${customer.firstName} ${customer.lastName}`;
    }
  }

  const submission = await prisma.formSubmission.create({
    data: {
      templateId,
      customerId: customerId || null,
      customerName: resolvedName || null,
      sentByUserId: session.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  void logAudit({ userId: session.id, action: "FORM_SUBMITTED", model: "FormSubmission", recordId: submission.id });
  revalidatePath("/forms");
  return { submissionId: submission.id, token: submission.token };
}

export async function createIntakePackage(
  prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await verifyRole("STAFF");

  const customerName = String(formData.get("customerName") || "").trim();
  const customerId = String(formData.get("customerId") || "").trim() || null;

  if (!customerName) return { error: "Patient name is required" };

  // Use unified intake flow
  const template = await prisma.formTemplate.findFirst({
    where: { type: "UNIFIED_INTAKE", isActive: true },
  });
  if (!template) return { error: "Unified intake template not found" };

  const submission = await prisma.formSubmission.create({
    data: {
      templateId: template.id,
      customerId,
      customerName,
      sentByUserId: session.id,
    },
  });

  void logAudit({ userId: session.id, action: "FORM_SUBMITTED", model: "FormSubmission", recordId: submission.id });
  revalidatePath("/forms");
  return { token: submission.token };
}

export async function autoPopulateFromSubmission(submissionId: string): Promise<FormActionState> {
  const session = await verifyRole("STAFF");
  void session;

  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    include: { template: true },
  });

  if (!submission || submission.status !== "COMPLETED" || !submission.data) {
    return { error: "Submission not found or not completed" };
  }

  const data = submission.data as Record<string, unknown>;

  try {
    await prisma.$transaction(async (tx) => {
      switch (submission.template.type) {
        case FormTemplateType.NEW_PATIENT: {
          const customerData = {
            firstName: String(data.firstName || ""),
            lastName: String(data.lastName || ""),
            email: data.email ? String(data.email) : null,
            phone: data.phone ? String(data.phone).replace(/\D/g, "") : null,
            dateOfBirth: data.dateOfBirth ? new Date(String(data.dateOfBirth)) : null,
            gender: data.gender ? (String(data.gender) as Gender) : null,
            address: data.address ? String(data.address) : null,
            city: data.city ? String(data.city) : null,
            province: data.province ? String(data.province) : null,
            postalCode: data.postalCode ? String(data.postalCode) : null,
            notes: data.notes ? String(data.notes) : null,
            hearAboutUs: data.hearAboutUs ? String(data.hearAboutUs) : null,
            referredByName: data.referredByName ? String(data.referredByName) : null,
            occupation: data.occupation ? String(data.occupation) : null,
          };

          if (submission.customerId) {
            await tx.customer.update({
              where: { id: submission.customerId },
              data: customerData,
            });
          } else {
            const newCustomer = await tx.customer.create({ data: customerData });
            await tx.formSubmission.update({
              where: { id: submissionId },
              data: { customerId: newCustomer.id },
            });
          }
          break;
        }

        case FormTemplateType.HIPAA_CONSENT: {
          if (submission.customerId) {
            await tx.customer.update({
              where: { id: submission.customerId },
              data: {
                smsOptIn: Boolean(data.smsOptIn),
                emailOptIn: Boolean(data.emailOptIn),
              },
            });
          }
          break;
        }

        case FormTemplateType.INSURANCE_VERIFICATION: {
          if (submission.customerId) {
            await tx.insurancePolicy.create({
              data: {
                customerId: submission.customerId,
                providerName: String(data.insuranceProviderName || "Unknown"),
                policyNumber: data.policyNumber ? String(data.policyNumber) : null,
                groupNumber: data.groupNumber ? String(data.groupNumber) : null,
                memberId: data.memberId ? String(data.memberId) : null,
                coverageType:
                  (data.coverageType as "VISION" | "OHIP" | "EXTENDED_HEALTH" | "COMBINED") ||
                  "VISION",
                renewalMonth: data.renewalMonth ? parseInt(String(data.renewalMonth)) : null,
                renewalYear: data.renewalYear ? parseInt(String(data.renewalYear)) : null,
                notes: data.notes ? String(data.notes) : null,
              },
            });
          }
          break;
        }

        case FormTemplateType.FRAME_REPAIR_WAIVER:
        case FormTemplateType.UNIFIED_INTAKE:
          break;
      }
    });
  } catch (err) {
    console.error("Auto-populate error:", err);
    return { error: "Failed to populate customer data" };
  }

  revalidatePath("/forms");
  revalidatePath(`/forms/${submissionId}`);
  if (submission.customerId) {
    revalidatePath(`/customers/${submission.customerId}`);
  }

  return {};
}

export async function applyIntakePackage(
  packageId: string
): Promise<{ error?: string; customerId?: string }> {
  const session = await verifyRole("STAFF");

  const pkg = await prisma.formPackage.findUnique({
    where: { id: packageId },
    include: {
      submissions: {
        include: { template: true },
        orderBy: { packageOrder: "asc" },
      },
    },
  });

  if (!pkg) return { error: "Intake package not found" };
  if (pkg.appliedAt) return { error: "Package already applied" };

  const completedSubs = pkg.submissions.filter((s) => s.status === "COMPLETED");

  try {
    await prisma.$transaction(async (tx) => {
      for (const sub of completedSubs) {
        if (!sub.data) continue;
        const data = sub.data as Record<string, unknown>;

        switch (sub.template.type) {
          case FormTemplateType.NEW_PATIENT: {
            const customerData = {
              firstName: String(data.firstName || ""),
              lastName: String(data.lastName || ""),
              email: data.email ? String(data.email) : null,
              phone: data.phone ? String(data.phone).replace(/\D/g, "") : null,
              dateOfBirth: data.dateOfBirth ? new Date(String(data.dateOfBirth)) : null,
              gender: data.gender ? (String(data.gender) as Gender) : null,
              address: data.address ? String(data.address) : null,
              city: data.city ? String(data.city) : null,
              province: data.province ? String(data.province) : null,
              postalCode: data.postalCode ? String(data.postalCode) : null,
              notes: data.notes ? String(data.notes) : null,
              hearAboutUs: data.hearAboutUs ? String(data.hearAboutUs) : null,
              referredByName: data.referredByName ? String(data.referredByName) : null,
              occupation: data.occupation ? String(data.occupation) : null,
            };
            if (sub.customerId) {
              await tx.customer.update({ where: { id: sub.customerId }, data: customerData });
            }
            break;
          }
          case FormTemplateType.HIPAA_CONSENT: {
            if (sub.customerId) {
              await tx.customer.update({
                where: { id: sub.customerId },
                data: {
                  smsOptIn: Boolean(data.smsOptIn),
                  emailOptIn: Boolean(data.emailOptIn),
                },
              });
            }
            break;
          }
          case FormTemplateType.INSURANCE_VERIFICATION: {
            if (sub.customerId) {
              // Avoid duplicates — skip if policy already exists for this provider
              const existing = await tx.insurancePolicy.findFirst({
                where: {
                  customerId: sub.customerId,
                  providerName: String(data.insuranceProviderName || "Unknown"),
                },
              });
              if (!existing) {
                await tx.insurancePolicy.create({
                  data: {
                    customerId: sub.customerId,
                    providerName: String(data.insuranceProviderName || "Unknown"),
                    policyNumber: data.policyNumber ? String(data.policyNumber) : null,
                    groupNumber: data.groupNumber ? String(data.groupNumber) : null,
                    memberId: data.memberId ? String(data.memberId) : null,
                    coverageType:
                      (data.coverageType as "VISION" | "OHIP" | "EXTENDED_HEALTH" | "COMBINED") ||
                      "VISION",
                    renewalMonth: data.renewalMonth ? parseInt(String(data.renewalMonth)) : null,
                    renewalYear: data.renewalYear ? parseInt(String(data.renewalYear)) : null,
                    notes: data.notes ? String(data.notes) : null,
                  },
                });
              }
            }
            break;
          }
          case FormTemplateType.FRAME_REPAIR_WAIVER:
          case FormTemplateType.UNIFIED_INTAKE:
            break;
        }
      }

      await tx.formPackage.update({
        where: { id: packageId },
        data: { appliedAt: new Date() },
      });

      if (pkg.customerId) {
        await tx.customer.update({
          where: { id: pkg.customerId },
          data: { isOnboarded: true },
        });
      }
    });
  } catch (err) {
    console.error("applyIntakePackage error:", err);
    return { error: "Failed to apply intake data" };
  }

  void logAudit({ userId: session.id, action: "INTAKE_APPLIED", model: "FormPackage", recordId: packageId });
  revalidatePath("/forms");
  if (pkg.customerId) revalidatePath(`/customers/${pkg.customerId}`);
  void session;
  return { customerId: pkg.customerId ?? undefined };
}

// ─── Send Intake Link from Customer Page ─────────────────────────────────────

export async function sendIntakeLinkEmail(
  customerId: string
): Promise<{ token: string } | { error: string }> {
  const session = await verifyRole("STAFF");

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!customer) return { error: "Customer not found" };
  if (!customer.email) return { error: "Customer has no email address on file" };

  const customerName = `${customer.firstName} ${customer.lastName}`.trim();

  // Use unified intake flow
  const template = await prisma.formTemplate.findFirst({
    where: { type: "UNIFIED_INTAKE", isActive: true },
  });
  if (!template) return { error: "Unified intake template not found" };

  const submission = await prisma.formSubmission.create({
    data: {
      templateId: template.id,
      customerId: customer.id,
      customerName,
      sentByUserId: session.id,
    },
  });

  // Send email
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const intakeUrl = `${baseUrl}/intake/${submission.token}`;

  try {
    const { sendIntakeEmail } = await import("@/lib/email");
    const result = await sendIntakeEmail({
      to: customer.email,
      customerName,
      intakeUrl,
    });

    if (result.error) {
      return { error: "Failed to send email" };
    }
  } catch {
    return { error: "Failed to send email" };
  }

  void logAudit({
    userId: session.id,
    action: "FORM_SUBMITTED",
    model: "FormSubmission",
    recordId: submission.id,
    changes: { method: "email", email: customer.email },
  });

  revalidatePath("/forms");
  return { token: submission.token };
}

export async function createIntakeLinkForCustomer(
  customerId: string
): Promise<{ token: string } | { error: string }> {
  const session = await verifyRole("STAFF");

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!customer) return { error: "Customer not found" };

  const customerName = `${customer.firstName} ${customer.lastName}`.trim();

  // Use unified intake flow
  const template = await prisma.formTemplate.findFirst({
    where: { type: "UNIFIED_INTAKE", isActive: true },
  });
  if (!template) return { error: "Unified intake template not found" };

  const submission = await prisma.formSubmission.create({
    data: {
      templateId: template.id,
      customerId: customer.id,
      customerName,
      sentByUserId: session.id,
    },
  });

  void logAudit({
    userId: session.id,
    action: "FORM_SUBMITTED",
    model: "FormSubmission",
    recordId: submission.id,
    changes: { method: "copy_link" },
  });

  revalidatePath("/forms");
  return { token: submission.token };
}

// ─── Public Self-Service Actions (no auth required) ─────────────────────────

export async function lookupReturningPatient(
  identifier: string,
  type: "phone" | "email",
  dateOfBirth: string
): Promise<{ prefill: import("@/lib/types/forms").ReturningPatientPrefill } | { notFound: true } | { error: string }> {
  const { checkRateLimit, timingSafeDelay } = await import("@/lib/rate-limit");

  // Validate input
  if (type === "phone") {
    const digits = identifier.replace(/\D/g, "");
    if (digits.length < 10) return { error: "Phone number must be at least 10 digits" };
    identifier = digits;
  } else {
    if (!identifier.includes("@") || identifier.length < 5) return { error: "Invalid email format" };
    identifier = identifier.trim().toLowerCase();
  }

  // Validate date of birth
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return { error: "Date of birth is required for verification" };
  }

  // Rate limit: 5 per identifier, 10 per IP per 15 min window
  const identifierKey = `lookup:${type}:${identifier}`;
  if (!checkRateLimit(identifierKey, 5)) {
    await timingSafeDelay();
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  // Fixed delay to prevent timing attacks
  await timingSafeDelay();

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        isActive: true,
        ...(type === "phone" ? { phone: identifier } : { email: identifier }),
      },
      include: {
        insurancePolicies: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) return { notFound: true };

    // Verify date of birth — return generic "not found" to avoid leaking that the phone/email exists
    const customerDob = customer.dateOfBirth?.toISOString().split("T")[0] ?? null;
    if (customerDob !== dateOfBirth) {
      return { notFound: true };
    }

    const insurance = customer.insurancePolicies[0] ?? null;

    return {
      prefill: {
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        dateOfBirth: customerDob,
        gender: customer.gender,
        address: customer.address,
        city: customer.city,
        province: customer.province,
        postalCode: customer.postalCode,
        occupation: customer.occupation,
        hearAboutUs: customer.hearAboutUs,
        insurance: insurance
          ? {
              providerName: insurance.providerName,
              policyNumber: insurance.policyNumber,
              groupNumber: insurance.groupNumber,
              memberId: insurance.memberId,
              coverageType: insurance.coverageType,
            }
          : null,
      },
    };
  } catch (e) {
    console.error("lookupReturningPatient error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

/** @deprecated Use createUnifiedIntakeSubmission instead — kept for old FormPackage backward compat */
export async function createSelfServiceIntakePackage(
  customerName: string,
  customerId?: string
): Promise<{ token: string } | { error: string }> {
  // Redirect to the new unified flow
  return createUnifiedIntakeSubmission(customerName, customerId);
}

export async function createUnifiedIntakeSubmission(
  customerName: string,
  customerId?: string
): Promise<{ token: string } | { error: string }> {
  if (!customerName.trim()) return { error: "Patient name is required" };

  const template = await prisma.formTemplate.findFirst({
    where: { type: "UNIFIED_INTAKE", isActive: true },
  });

  if (!template) return { error: "Unified intake template not found" };

  try {
    const submission = await prisma.formSubmission.create({
      data: {
        templateId: template.id,
        customerId: customerId || null,
        customerName: customerName.trim(),
        sentByUserId: null, // self-service
      },
    });

    return { token: submission.token };
  } catch (e) {
    console.error("createUnifiedIntakeSubmission error:", e);
    return { error: "Failed to create intake form" };
  }
}

export async function completeUnifiedIntake(
  token: string,
  formData: import("@/lib/types/unified-intake").IntakeFormState
): Promise<{ error?: string }> {
  const { UnifiedIntakeSchema } = await import("@/lib/validations/unified-intake");

  const submission = await prisma.formSubmission.findUnique({
    where: { token },
    select: { id: true, status: true, customerId: true, customerName: true, template: { select: { type: true } } },
  });

  if (!submission) return { error: "Form not found" };
  if (submission.status === "COMPLETED") return { error: "Form already completed" };
  if (submission.template.type !== "UNIFIED_INTAKE") return { error: "Invalid form type" };

  // Validate
  const parsed = UnifiedIntakeSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Store raw data + mark completed
      await tx.formSubmission.update({
        where: { token },
        data: {
          status: "COMPLETED",
          data: formData as unknown as Record<string, string | number | boolean | null>,
          completedAt: new Date(),
        },
      });

      const createdCustomerIds: string[] = [];

      for (let i = 0; i < data.patients.length; i++) {
        const patient = data.patients[i];
        const nameParts = patient.fullName.trim().split(/\s+/);
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Determine contact details
        const useContact = i > 0 && patient.sameContactAsPrimary;
        const phone = useContact ? data.contactTelephone.replace(/\D/g, "") : (patient.telephone?.replace(/\D/g, "") || null);
        const address = useContact ? data.contactAddress : (patient.address || null);

        // Map gender
        const genderMap: Record<string, Gender> = {
          Male: "MALE",
          Female: "FEMALE",
          Other: "OTHER",
          "Prefer not to say": "PREFER_NOT_TO_SAY",
        };

        const customerData = {
          firstName,
          lastName,
          email: i === 0 ? data.contactEmail : null,
          phone,
          dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : null,
          gender: genderMap[patient.gender] || null,
          address,
          city: useContact ? data.contactCity : null,
          hearAboutUs: data.hearAboutUs || null,
          isOnboarded: true,
          primaryContactName: data.contactFullName,
          primaryContactPhone: data.contactTelephone.replace(/\D/g, ""),
          primaryContactEmail: data.contactEmail,
        };

        // If returning patient (index 0 with customerId) — update existing
        if (i === 0 && submission.customerId) {
          await tx.customer.update({
            where: { id: submission.customerId },
            data: customerData,
          });
          createdCustomerIds.push(submission.customerId);
        } else {
          const newCustomer = await tx.customer.create({ data: customerData });
          createdCustomerIds.push(newCustomer.id);
        }
      }

      // Link the first customer to the submission
      if (createdCustomerIds[0] && !submission.customerId) {
        await tx.formSubmission.update({
          where: { token },
          data: { customerId: createdCustomerIds[0] },
        });
      }

      // Create insurance policy if provided
      if (data.visionInsurance === "Yes, I have vision insurance" && data.insuranceProviderName && createdCustomerIds[0]) {
        await tx.insurancePolicy.create({
          data: {
            customerId: createdCustomerIds[0],
            providerName: data.insuranceProviderName,
            policyNumber: data.insurancePolicyNumber || null,
            memberId: data.insuranceMemberId || null,
            coverageType: "VISION",
          },
        });
      }
    });

    // Fire notification (outside transaction)
    const patientCount = data.patients.length;
    const contactName = data.contactFullName || submission.customerName || "A patient";
    await createNotification({
      type: "INTAKE_COMPLETED",
      title: "Unified Intake Completed",
      body: `${contactName} completed intake for ${patientCount} patient${patientCount > 1 ? "s" : ""}.`,
      href: `/forms/${submission.id}`,
      refId: submission.id,
      refType: "FormSubmission",
    });

    revalidatePath("/forms");
    return {};
  } catch (e) {
    console.error("completeUnifiedIntake error:", e);
    return { error: "Failed to process intake form" };
  }
}

// ─── Public Actions (no auth required) ──────────────────────────────────────

export async function completeFormSubmission(
  token: string,
  formData: Record<string, unknown>,
  signatureText?: string
): Promise<{ error?: string }> {
  const submission = await prisma.formSubmission.findUnique({
    where: { token },
    select: { id: true, status: true, expiresAt: true },
  });

  if (!submission) return { error: "Form not found" };
  if (submission.status === "COMPLETED") return { error: "Form already completed" };

  if (submission.expiresAt && new Date() > submission.expiresAt) {
    await prisma.formSubmission.update({ where: { token }, data: { status: "EXPIRED" } });
    return { error: "Form has expired" };
  }

  const completed = await prisma.formSubmission.update({
    where: { token },
    data: {
      status: "COMPLETED",
      data: formData as Record<string, string | number | boolean | null>,
      signatureText: signatureText || null,
      signedAt: signatureText ? new Date() : null,
      completedAt: new Date(),
    },
    select: { customerName: true, id: true, template: { select: { name: true } } },
  });

  await createNotification({
    type: "FORM_COMPLETED",
    title: "Form Submitted",
    body: `${completed.template.name}${completed.customerName ? ` from ${completed.customerName}` : ""} was submitted.`,
    href: `/forms/${completed.id}`,
    refId: completed.id,
    refType: "FormSubmission",
  });

  revalidatePath("/forms");
  return {};
}

export async function completeIntakeStep(
  packageToken: string,
  submissionToken: string,
  formData: Record<string, unknown>,
  signatureText?: string
): Promise<{ error?: string; allDone?: boolean }> {
  const pkg = await prisma.formPackage.findUnique({
    where: { token: packageToken },
    include: {
      submissions: {
        include: { template: true },
        orderBy: { packageOrder: "asc" },
      },
    },
  });

  if (!pkg) return { error: "Intake package not found" };

  const submission = pkg.submissions.find((s) => s.token === submissionToken);
  if (!submission) return { error: "Form not found in this package" };
  if (submission.status === "COMPLETED") return {};

  // Mark this submission complete
  await prisma.formSubmission.update({
    where: { token: submissionToken },
    data: {
      status: "COMPLETED",
      data: formData as Record<string, string | number | boolean | null>,
      signatureText: signatureText || null,
      signedAt: signatureText ? new Date() : null,
      completedAt: new Date(),
    },
  });

  // If NEW_PATIENT and no customer yet: create one and link the whole package
  if (submission.template.type === "NEW_PATIENT" && !pkg.customerId) {
    const d = formData;
    const newCustomer = await prisma.customer.create({
      data: {
        firstName: String(d.firstName || ""),
        lastName: String(d.lastName || ""),
        email: d.email ? String(d.email) : null,
        phone: d.phone ? String(d.phone).replace(/\D/g, "") : null,
        dateOfBirth: d.dateOfBirth ? new Date(String(d.dateOfBirth)) : null,
        gender: d.gender ? (String(d.gender) as Gender) : null,
        address: d.address ? String(d.address) : null,
        city: d.city ? String(d.city) : null,
        province: d.province ? String(d.province) : null,
        postalCode: d.postalCode ? String(d.postalCode) : null,
        hearAboutUs: d.hearAboutUs ? String(d.hearAboutUs) : null,
        referredByName: d.referredByName ? String(d.referredByName) : null,
        occupation: d.occupation ? String(d.occupation) : null,
      },
    });

    await prisma.formPackage.update({
      where: { id: pkg.id },
      data: { customerId: newCustomer.id, status: "IN_PROGRESS" },
    });

    await prisma.formSubmission.updateMany({
      where: { packageId: pkg.id },
      data: { customerId: newCustomer.id },
    });
  } else if (submission.template.type === "NEW_PATIENT" && pkg.customerId) {
    // Returning patient — update their info with any changes they made
    const d = formData;
    await prisma.customer.update({
      where: { id: pkg.customerId },
      data: {
        firstName: String(d.firstName || ""),
        lastName: String(d.lastName || ""),
        email: d.email ? String(d.email) : undefined,
        phone: d.phone ? String(d.phone).replace(/\D/g, "") : undefined,
        dateOfBirth: d.dateOfBirth ? new Date(String(d.dateOfBirth)) : undefined,
        gender: d.gender ? (String(d.gender) as Gender) : undefined,
        address: d.address ? String(d.address) : undefined,
        city: d.city ? String(d.city) : undefined,
        province: d.province ? String(d.province) : undefined,
        postalCode: d.postalCode ? String(d.postalCode) : undefined,
        hearAboutUs: d.hearAboutUs ? String(d.hearAboutUs) : undefined,
        referredByName: d.referredByName ? String(d.referredByName) : undefined,
        occupation: d.occupation ? String(d.occupation) : undefined,
      },
    });

    if (pkg.status === "PENDING") {
      await prisma.formPackage.update({
        where: { id: pkg.id },
        data: { status: "IN_PROGRESS" },
      });
    }
  } else if (pkg.status === "PENDING") {
    await prisma.formPackage.update({
      where: { id: pkg.id },
      data: { status: "IN_PROGRESS" },
    });
  }

  // Check if all steps done
  const allSubmissions = await prisma.formSubmission.findMany({
    where: { packageId: pkg.id },
  });
  const allDone = allSubmissions.every(
    (s) => s.token === submissionToken || s.status === "COMPLETED"
  );

  if (allDone) {
    const updatedPkg = await prisma.formPackage.findUnique({ where: { id: pkg.id } });
    await prisma.formPackage.update({
      where: { id: pkg.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (updatedPkg?.customerId) {
      await prisma.customer.update({
        where: { id: updatedPkg.customerId },
        data: { isOnboarded: true },
      });
      revalidatePath(`/customers/${updatedPkg.customerId}`);
    }

    await createNotification({
      type: "INTAKE_COMPLETED",
      title: "Intake Package Completed",
      body: `${pkg.customerName || "A patient"} completed all 3 intake forms.`,
      href: `/forms`,
      refId: pkg.id,
      refType: "FormPackage",
    });
  }

  revalidatePath("/forms");
  return { allDone };
}
