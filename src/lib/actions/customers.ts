"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { CustomerSchema, MedicalHistorySchema, StoreCreditSchema } from "@/lib/validations/customer";
import { Gender } from "@prisma/client";

export type CustomerFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createCustomer(
  prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  await verifySession();

  const raw = Object.fromEntries(formData.entries());
  const parsed = CustomerSchema.safeParse({
    ...raw,
    smsOptIn: raw.smsOptIn === "on" || raw.smsOptIn === "true",
    emailOptIn: raw.emailOptIn === "on" || raw.emailOptIn === "true",
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone?.replace(/\D/g, "") || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: (data.gender as Gender) || null,
      address: data.address || null,
      city: data.city || null,
      province: data.province || null,
      postalCode: data.postalCode || null,
      notes: data.notes || null,
      familyId: data.familyId || null,
      smsOptIn: data.smsOptIn,
      emailOptIn: data.emailOptIn,
      hearAboutUs: data.hearAboutUs || null,
      referredByName: data.referredByName || null,
      occupation: data.occupation || null,
    },
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(
  id: string,
  prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  await verifySession();

  const raw = Object.fromEntries(formData.entries());
  const parsed = CustomerSchema.safeParse({
    ...raw,
    smsOptIn: raw.smsOptIn === "on" || raw.smsOptIn === "true",
    emailOptIn: raw.emailOptIn === "on" || raw.emailOptIn === "true",
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  await prisma.customer.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone?.replace(/\D/g, "") || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: (data.gender as Gender) || null,
      address: data.address || null,
      city: data.city || null,
      province: data.province || null,
      postalCode: data.postalCode || null,
      notes: data.notes || null,
      familyId: data.familyId || null,
      smsOptIn: data.smsOptIn,
      emailOptIn: data.emailOptIn,
      hearAboutUs: data.hearAboutUs || null,
      referredByName: data.referredByName || null,
      occupation: data.occupation || null,
    },
  });

  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: string) {
  await verifySession();

  await prisma.customer.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/customers");
  redirect("/customers");
}

export type MedicalHistoryFormState = {
  error?: string;
  success?: boolean;
};

export async function saveMedicalHistory(
  customerId: string,
  prevState: MedicalHistoryFormState,
  formData: FormData
): Promise<MedicalHistoryFormState> {
  await verifySession();

  const raw = Object.fromEntries(formData.entries());

  // Parse array fields from multi-value form data
  const eyeConditions = formData.getAll("eyeConditions").map(String);
  const systemicConditions = formData.getAll("systemicConditions").map(String);

  const parsed = MedicalHistorySchema.safeParse({
    eyeConditions,
    systemicConditions,
    medications: raw.medications || "",
    allergies: raw.allergies || "",
    familyGlaucoma: raw.familyGlaucoma === "on" || raw.familyGlaucoma === "true",
    familyAmd: raw.familyAmd === "on" || raw.familyAmd === "true",
    familyHighMyopia: raw.familyHighMyopia === "on" || raw.familyHighMyopia === "true",
    familyColorblind: raw.familyColorblind === "on" || raw.familyColorblind === "true",
    hadLasik: raw.hadLasik === "on" || raw.hadLasik === "true",
    wearsContacts: raw.wearsContacts === "on" || raw.wearsContacts === "true",
    contactType: raw.contactType || "",
    primaryUse: raw.primaryUse || "",
    screenTimeDaily: raw.screenTimeDaily ? parseFloat(raw.screenTimeDaily as string) : null,
    notes: raw.notes || "",
  });

  if (!parsed.success) {
    return { error: "Invalid data. Please check your entries." };
  }

  const data = parsed.data;

  await prisma.medicalHistory.upsert({
    where: { customerId },
    create: {
      customerId,
      eyeConditions: data.eyeConditions,
      systemicConditions: data.systemicConditions,
      medications: data.medications || null,
      allergies: data.allergies || null,
      familyGlaucoma: data.familyGlaucoma,
      familyAmd: data.familyAmd,
      familyHighMyopia: data.familyHighMyopia,
      familyColorblind: data.familyColorblind,
      hadLasik: data.hadLasik,
      wearsContacts: data.wearsContacts,
      contactType: data.contactType || null,
      primaryUse: data.primaryUse || null,
      screenTimeDaily: data.screenTimeDaily ?? null,
      notes: data.notes || null,
    },
    update: {
      eyeConditions: data.eyeConditions,
      systemicConditions: data.systemicConditions,
      medications: data.medications || null,
      allergies: data.allergies || null,
      familyGlaucoma: data.familyGlaucoma,
      familyAmd: data.familyAmd,
      familyHighMyopia: data.familyHighMyopia,
      familyColorblind: data.familyColorblind,
      hadLasik: data.hadLasik,
      wearsContacts: data.wearsContacts,
      contactType: data.contactType || null,
      primaryUse: data.primaryUse || null,
      screenTimeDaily: data.screenTimeDaily ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export type StoreCreditFormState = {
  error?: string;
  success?: boolean;
};

export async function addStoreCredit(
  customerId: string,
  prevState: StoreCreditFormState,
  formData: FormData
): Promise<StoreCreditFormState> {
  await verifySession();

  const raw = Object.fromEntries(formData.entries());
  const parsed = StoreCreditSchema.safeParse({
    type: raw.type,
    amount: raw.amount ? parseFloat(raw.amount as string) : 0,
    description: raw.description || "",
    expiresAt: raw.expiresAt || "",
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const first = Object.values(errors).flat()[0];
    return { error: first || "Invalid data." };
  }

  const data = parsed.data;

  await prisma.storeCredit.create({
    data: {
      customerId,
      type: data.type,
      amount: data.amount,
      description: data.description || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function deactivateStoreCredit(creditId: string): Promise<{ error?: string }> {
  await verifySession();

  const credit = await prisma.storeCredit.findUnique({ where: { id: creditId } });
  if (!credit) return { error: "Credit not found." };

  await prisma.storeCredit.update({
    where: { id: creditId },
    data: { isActive: false },
  });

  revalidatePath(`/customers/${credit.customerId}`);
  return {};
}

export type CustomerSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
};

export async function searchCustomers(query: string): Promise<CustomerSearchResult[]> {
  await verifySession();

  const q = query.trim();
  if (!q) return [];

  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        ...(q.replace(/\D/g, "") ? [{ phone: { contains: q.replace(/\D/g, "") } }] : []),
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 10,
  });

  return customers;
}

export async function findFamilyMatches(
  phone?: string | null,
  address?: string | null,
  excludeId?: string
): Promise<Array<{ id: string; firstName: string; lastName: string; phone: string | null; familyId: string | null }>> {
  await verifySession();

  if (!phone && !address) return [];

  const cleanPhone = phone?.replace(/\D/g, "");

  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        cleanPhone ? { phone: cleanPhone } : undefined,
        address ? { address: { contains: address, mode: "insensitive" } } : undefined,
      ].filter(Boolean) as any[],
    },
    select: { id: true, firstName: true, lastName: true, phone: true, familyId: true },
    take: 10,
  });

  return customers;
}

export async function createFamilyAndLink(
  familyName: string,
  customerIds: string[]
): Promise<{ familyId: string } | { error: string }> {
  await verifySession();

  if (!familyName || customerIds.length === 0) {
    return { error: "Family name and at least one customer required" };
  }

  try {
    const family = await prisma.family.create({ data: { name: familyName } });

    await prisma.customer.updateMany({
      where: { id: { in: customerIds } },
      data: { familyId: family.id },
    });

    for (const id of customerIds) revalidatePath(`/customers/${id}`);
    return { familyId: family.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create family group" };
  }
}

export async function addToFamily(
  familyId: string,
  customerId: string
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { familyId },
    });

    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to add to family" };
  }
}

export async function quickCreateCustomer(input: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}): Promise<{ id: string; name: string } | { error: string }> {
  await verifySession();

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!firstName || !lastName) {
    return { error: "First and last name are required" };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        phone: input.phone?.replace(/\D/g, "") || null,
        email: input.email?.trim() || null,
      },
    });

    revalidatePath("/customers");
    return { id: customer.id, name: `${firstName} ${lastName}` };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create customer" };
  }
}
