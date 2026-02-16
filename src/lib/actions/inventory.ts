"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { uploadInventoryPhoto } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const InventorySchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  sku: z.string().optional(),
  category: z.enum(["OPTICAL", "SUN", "READING", "SAFETY", "SPORT"]),
  gender: z.enum(["MENS", "WOMENS", "UNISEX", "KIDS"]),
  color: z.string().optional(),
  material: z.string().optional(),
  size: z.string().optional(),
  eyeSize: z.coerce.number().int().positive().optional().or(z.literal("")),
  bridgeSize: z.coerce.number().int().positive().optional().or(z.literal("")),
  templeLength: z.coerce.number().int().positive().optional().or(z.literal("")),
  rimType: z.enum(["FULL_RIM", "HALF_RIM", "RIMLESS"]).optional().or(z.literal("")),
  wholesaleCost: z.coerce.number().min(0).optional().or(z.literal("")),
  retailPrice: z.coerce.number().min(0).optional().or(z.literal("")),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(2),
  notes: z.string().optional(),
});

export type InventoryFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseForm(formData: FormData) {
  return {
    brand: formData.get("brand") as string,
    model: formData.get("model") as string,
    sku: (formData.get("sku") as string) || undefined,
    category: formData.get("category") as string,
    gender: formData.get("gender") as string,
    color: (formData.get("color") as string) || undefined,
    material: (formData.get("material") as string) || undefined,
    size: (formData.get("size") as string) || undefined,
    eyeSize: (formData.get("eyeSize") as string) || "",
    bridgeSize: (formData.get("bridgeSize") as string) || "",
    templeLength: (formData.get("templeLength") as string) || "",
    rimType: (formData.get("rimType") as string) || "",
    wholesaleCost: (formData.get("wholesaleCost") as string) || "",
    retailPrice: (formData.get("retailPrice") as string) || "",
    stockQuantity: (formData.get("stockQuantity") as string) || "0",
    reorderPoint: (formData.get("reorderPoint") as string) || "2",
    notes: (formData.get("notes") as string) || undefined,
  };
}

export async function createInventoryItem(
  _state: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  await verifySession();

  const parsed = InventorySchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const d = parsed.data;

  try {
    const item = await prisma.inventoryItem.create({
      data: {
        brand: d.brand,
        model: d.model,
        sku: d.sku || null,
        category: d.category as any,
        gender: d.gender as any,
        color: d.color || null,
        material: d.material || null,
        size: d.size || null,
        eyeSize: d.eyeSize !== "" ? Number(d.eyeSize) : null,
        bridgeSize: d.bridgeSize !== "" ? Number(d.bridgeSize) : null,
        templeLength: d.templeLength !== "" ? Number(d.templeLength) : null,
        rimType: (d.rimType !== "" ? d.rimType : null) as any,
        wholesaleCost: d.wholesaleCost !== "" ? Number(d.wholesaleCost) : null,
        retailPrice: d.retailPrice !== "" ? Number(d.retailPrice) : null,
        stockQuantity: Number(d.stockQuantity),
        reorderPoint: Number(d.reorderPoint),
        notes: d.notes || null,
      },
    });

    // Handle photo upload
    const photo = formData.get("photo") as File | null;
    if (photo && photo.size > 0) {
      const imageUrl = await uploadInventoryPhoto(photo, item.id);
      if (imageUrl) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { imageUrl },
        });
      }
    }

    revalidatePath("/inventory");
    redirect(`/inventory/${item.id}`);
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    if (e?.code === "P2002") {
      return { error: "An item with that SKU already exists." };
    }
    return { error: "Failed to create item. Please try again." };
  }
}

export async function updateInventoryItem(
  id: string,
  _state: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  await verifySession();

  const parsed = InventorySchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const d = parsed.data;

  try {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        brand: d.brand,
        model: d.model,
        sku: d.sku || null,
        category: d.category as any,
        gender: d.gender as any,
        color: d.color || null,
        material: d.material || null,
        size: d.size || null,
        eyeSize: d.eyeSize !== "" ? Number(d.eyeSize) : null,
        bridgeSize: d.bridgeSize !== "" ? Number(d.bridgeSize) : null,
        templeLength: d.templeLength !== "" ? Number(d.templeLength) : null,
        rimType: (d.rimType !== "" ? d.rimType : null) as any,
        wholesaleCost: d.wholesaleCost !== "" ? Number(d.wholesaleCost) : null,
        retailPrice: d.retailPrice !== "" ? Number(d.retailPrice) : null,
        stockQuantity: Number(d.stockQuantity),
        reorderPoint: Number(d.reorderPoint),
        notes: d.notes || null,
      },
    });

    // Handle photo upload
    const photo = formData.get("photo") as File | null;
    if (photo && photo.size > 0) {
      const imageUrl = await uploadInventoryPhoto(photo, item.id);
      if (imageUrl) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { imageUrl },
        });
      }
    }

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${id}`);
    redirect(`/inventory/${id}`);
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    if (e?.code === "P2002") {
      return { error: "An item with that SKU already exists." };
    }
    return { error: "Failed to update item. Please try again." };
  }
}
