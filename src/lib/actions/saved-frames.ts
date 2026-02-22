"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { SavedFrameSchema } from "@/lib/validations/saved-frame";
import { uploadPrescriptionScan } from "@/lib/supabase";

export async function saveFrame(
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  const session = await verifySession();

  const parsed = SavedFrameSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  try {
    const frame = await prisma.savedFrame.create({
      data: {
        customerId: data.customerId,
        inventoryItemId: data.inventoryItemId || null,
        brand: data.brand,
        model: data.model || null,
        color: data.color || null,
        sku: data.sku || null,
        photoUrl: data.photoUrl || null,
        notes: data.notes || null,
        savedBy: session.name,
        isFavorite: data.isFavorite ?? false,
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
      },
    });

    revalidatePath(`/customers/${data.customerId}`);
    return { id: frame.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save frame" };
  }
}

export async function uploadFramePhoto(
  base64: string,
  mimeType: string,
  customerId: string
): Promise<{ url: string } | { error: string }> {
  await verifySession();

  try {
    const url = await uploadPrescriptionScan(base64, mimeType, customerId);
    if (!url) return { error: "Upload failed" };
    return { url };
  } catch (e) {
    console.error(e);
    return { error: "Failed to upload photo" };
  }
}

export async function removeSavedFrame(
  frameId: string
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  try {
    const frame = await prisma.savedFrame.findUnique({
      where: { id: frameId },
      select: { customerId: true },
    });
    if (!frame) return { error: "Frame not found" };

    await prisma.savedFrame.delete({ where: { id: frameId } });
    revalidatePath(`/customers/${frame.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to remove frame" };
  }
}

export async function toggleFavorite(
  frameId: string
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  try {
    const frame = await prisma.savedFrame.findUnique({
      where: { id: frameId },
      select: { customerId: true, isFavorite: true },
    });
    if (!frame) return { error: "Frame not found" };

    await prisma.savedFrame.update({
      where: { id: frameId },
      data: { isFavorite: !frame.isFavorite },
    });

    revalidatePath(`/customers/${frame.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to toggle favorite" };
  }
}

export async function updateExpectedReturnDate(
  frameId: string,
  date: string | null
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  try {
    const frame = await prisma.savedFrame.findUnique({
      where: { id: frameId },
      select: { customerId: true },
    });
    if (!frame) return { error: "Frame not found" };

    await prisma.savedFrame.update({
      where: { id: frameId },
      data: { expectedReturnDate: date ? new Date(date) : null },
    });

    revalidatePath(`/customers/${frame.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update return date" };
  }
}
