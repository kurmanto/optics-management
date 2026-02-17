"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const VendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  minOrderQty: z.coerce.number().int().min(0).optional().or(z.literal("")),
  leadTimeDays: z.coerce.number().int().min(0).optional().or(z.literal("")),
  returnPolicy: z.string().optional(),
  repName: z.string().optional(),
  repEmail: z.string().email("Invalid rep email").optional().or(z.literal("")),
  repPhone: z.string().optional(),
  notes: z.string().optional(),
});

export type VendorFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseForm(formData: FormData) {
  const paymentMethods = formData.getAll("paymentMethods") as string[];
  return {
    name: formData.get("name") as string,
    contactName: (formData.get("contactName") as string) || undefined,
    email: (formData.get("email") as string) || "",
    phone: (formData.get("phone") as string) || undefined,
    website: (formData.get("website") as string) || undefined,
    address: (formData.get("address") as string) || undefined,
    paymentTerms: (formData.get("paymentTerms") as string) || undefined,
    minOrderQty: (formData.get("minOrderQty") as string) || "",
    leadTimeDays: (formData.get("leadTimeDays") as string) || "",
    returnPolicy: (formData.get("returnPolicy") as string) || undefined,
    repName: (formData.get("repName") as string) || undefined,
    repEmail: (formData.get("repEmail") as string) || "",
    repPhone: (formData.get("repPhone") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    paymentMethods,
  };
}

export async function createVendor(
  _state: VendorFormState,
  formData: FormData
): Promise<VendorFormState> {
  await verifySession();
  const raw = parseForm(formData);
  const parsed = VendorSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const d = parsed.data;
  try {
    const vendor = await prisma.vendor.create({
      data: {
        name: d.name,
        contactName: d.contactName || null,
        email: d.email || null,
        phone: d.phone || null,
        website: d.website || null,
        address: d.address || null,
        paymentTerms: d.paymentTerms || null,
        minOrderQty: d.minOrderQty !== "" ? Number(d.minOrderQty) : null,
        leadTimeDays: d.leadTimeDays !== "" ? Number(d.leadTimeDays) : null,
        paymentMethods: raw.paymentMethods,
        returnPolicy: d.returnPolicy || null,
        repName: d.repName || null,
        repEmail: d.repEmail || null,
        repPhone: d.repPhone || null,
        notes: d.notes || null,
      },
    });
    revalidatePath("/inventory/vendors");
    redirect(`/inventory/vendors/${vendor.id}`);
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: "Failed to create vendor. Please try again." };
  }
}

export async function updateVendor(
  id: string,
  _state: VendorFormState,
  formData: FormData
): Promise<VendorFormState> {
  await verifySession();
  const raw = parseForm(formData);
  const parsed = VendorSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const d = parsed.data;
  try {
    await prisma.vendor.update({
      where: { id },
      data: {
        name: d.name,
        contactName: d.contactName || null,
        email: d.email || null,
        phone: d.phone || null,
        website: d.website || null,
        address: d.address || null,
        paymentTerms: d.paymentTerms || null,
        minOrderQty: d.minOrderQty !== "" ? Number(d.minOrderQty) : null,
        leadTimeDays: d.leadTimeDays !== "" ? Number(d.leadTimeDays) : null,
        paymentMethods: raw.paymentMethods,
        returnPolicy: d.returnPolicy || null,
        repName: d.repName || null,
        repEmail: d.repEmail || null,
        repPhone: d.repPhone || null,
        notes: d.notes || null,
      },
    });
    revalidatePath("/inventory/vendors");
    revalidatePath(`/inventory/vendors/${id}`);
    redirect(`/inventory/vendors/${id}`);
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: "Failed to update vendor. Please try again." };
  }
}

export async function deleteVendor(id: string): Promise<{ error?: string }> {
  await verifySession();
  try {
    await prisma.vendor.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/inventory/vendors");
    return {};
  } catch {
    return { error: "Failed to deactivate vendor." };
  }
}
