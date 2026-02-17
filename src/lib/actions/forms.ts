"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { CreateFormSubmissionSchema } from "@/lib/validations/forms";
import { FormTemplateType, Gender } from "@prisma/client";

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
  const session = await verifySession();

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

  revalidatePath("/forms");
  return { submissionId: submission.id, token: submission.token };
}

export async function createIntakePackage(
  prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await verifySession();

  const customerName = String(formData.get("customerName") || "").trim();
  const customerEmail = String(formData.get("customerEmail") || "").trim() || null;
  const customerId = String(formData.get("customerId") || "").trim() || null;

  if (!customerName) return { error: "Patient name is required" };

  // Get the 3 intake templates
  const intakeOrder: FormTemplateType[] = [
    "NEW_PATIENT",
    "HIPAA_CONSENT",
    "INSURANCE_VERIFICATION",
  ];
  const templates = await prisma.formTemplate.findMany({
    where: { type: { in: intakeOrder }, isActive: true },
  });

  if (templates.length === 0) return { error: "Intake form templates not found" };

  // Resolve name from existing customer if needed
  let resolvedName = customerName;
  if (customerId && !customerName) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (customer) resolvedName = `${customer.firstName} ${customer.lastName}`;
  }

  const pkg = await prisma.$transaction(async (tx) => {
    const newPkg = await tx.formPackage.create({
      data: {
        customerName: resolvedName,
        customerEmail,
        customerId,
        sentByUserId: session.id,
      },
    });

    for (let i = 0; i < intakeOrder.length; i++) {
      const template = templates.find((t) => t.type === intakeOrder[i]);
      if (!template) continue;
      await tx.formSubmission.create({
        data: {
          templateId: template.id,
          customerId,
          customerName: resolvedName,
          sentByUserId: session.id,
          packageId: newPkg.id,
          packageOrder: i,
        },
      });
    }

    return newPkg;
  });

  revalidatePath("/forms");
  return { token: pkg.token };
}

export async function autoPopulateFromSubmission(submissionId: string): Promise<FormActionState> {
  const session = await verifySession();
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
  const session = await verifySession();

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

  revalidatePath("/forms");
  if (pkg.customerId) revalidatePath(`/customers/${pkg.customerId}`);
  void session;
  return { customerId: pkg.customerId ?? undefined };
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

  await prisma.formSubmission.update({
    where: { token },
    data: {
      status: "COMPLETED",
      data: formData as Record<string, string | number | boolean | null>,
      signatureText: signatureText || null,
      signedAt: signatureText ? new Date() : null,
      completedAt: new Date(),
    },
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
  }

  revalidatePath("/forms");
  return { allDone };
}
