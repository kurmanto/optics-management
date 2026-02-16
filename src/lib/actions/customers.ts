"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { CustomerSchema } from "@/lib/validations/customer";
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
