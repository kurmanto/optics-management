"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { InsurancePolicySchema } from "@/lib/validations/insurance";
import { CoverageType } from "@prisma/client";

export async function addInsurancePolicy(
  customerId: string,
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  await verifySession();

  const parsed = InsurancePolicySchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  try {
    const policy = await prisma.insurancePolicy.create({
      data: {
        customerId,
        providerName: data.providerName,
        policyNumber: data.policyNumber || null,
        groupNumber: data.groupNumber || null,
        memberId: data.memberId || null,
        coverageType: data.coverageType as CoverageType,
        contractNumber: data.contractNumber || null,
        estimatedCoverage: data.estimatedCoverage ?? null,
        maxFrames: data.maxFrames ?? null,
        maxLenses: data.maxLenses ?? null,
        maxContacts: data.maxContacts ?? null,
        maxExam: data.maxExam ?? null,
        lastClaimDate: data.lastClaimDate ? new Date(data.lastClaimDate) : null,
        eligibilityIntervalMonths: data.eligibilityIntervalMonths,
        notes: data.notes || null,
      },
    });

    revalidatePath(`/customers/${customerId}`);
    return { id: policy.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to add insurance policy" };
  }
}

export async function updateInsurancePolicy(
  id: string,
  rawData: unknown
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession();

  const parsed = InsurancePolicySchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  try {
    const policy = await prisma.insurancePolicy.findUnique({
      where: { id },
      select: { customerId: true },
    });
    if (!policy) return { error: "Policy not found" };

    await prisma.insurancePolicy.update({
      where: { id },
      data: {
        providerName: data.providerName,
        policyNumber: data.policyNumber || null,
        groupNumber: data.groupNumber || null,
        memberId: data.memberId || null,
        coverageType: data.coverageType as CoverageType,
        contractNumber: data.contractNumber || null,
        estimatedCoverage: data.estimatedCoverage ?? null,
        maxFrames: data.maxFrames ?? null,
        maxLenses: data.maxLenses ?? null,
        maxContacts: data.maxContacts ?? null,
        maxExam: data.maxExam ?? null,
        lastClaimDate: data.lastClaimDate ? new Date(data.lastClaimDate) : null,
        eligibilityIntervalMonths: data.eligibilityIntervalMonths,
        notes: data.notes || null,
      },
    });

    revalidatePath(`/customers/${policy.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update insurance policy" };
  }
}

export async function deactivateInsurancePolicy(
  id: string
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  try {
    const policy = await prisma.insurancePolicy.findUnique({
      where: { id },
      select: { customerId: true },
    });
    if (!policy) return { error: "Policy not found" };

    await prisma.insurancePolicy.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath(`/customers/${policy.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to deactivate policy" };
  }
}
