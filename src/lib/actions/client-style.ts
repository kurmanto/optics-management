"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyClientSession } from "@/lib/client-dal";
import { StyleQuizSchema } from "@/lib/validations/client-portal";
import {
  computeStyleLabel,
  buildFrameMatchFilters,
  buildBroadenedFilters,
  type StyleChoice,
  type StyleProfile,
} from "@/lib/utils/style-quiz";
import { checkAndUnlockCards } from "@/lib/unlock-triggers";

const MAX_MATCHED_FRAMES = 12;
const MIN_RESULTS_BEFORE_BROADEN = 3;

export async function submitStyleQuiz(
  customerId: string,
  choices: StyleChoice
): Promise<{ error?: string; profile?: StyleProfile }> {
  const session = await verifyClientSession();

  const parsed = StyleQuizSchema.safeParse({ customerId, choices });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify customer belongs to family
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { familyId: true },
  });
  if (!customer || customer.familyId !== session.familyId) {
    return { error: "Invalid family member." };
  }

  const label = computeStyleLabel(choices);
  const profile: StyleProfile = {
    completedAt: new Date().toISOString(),
    label,
    choices,
  };

  await prisma.customer.update({
    where: { id: customerId },
    data: { styleProfile: profile as unknown as Prisma.InputJsonValue },
  });

  void checkAndUnlockCards(session.familyId);

  return { profile };
}

export async function getStyleProfile(customerId: string): Promise<StyleProfile | null> {
  const session = await verifyClientSession();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { familyId: true, styleProfile: true },
  });
  if (!customer || customer.familyId !== session.familyId) {
    return null;
  }

  return (customer.styleProfile as unknown as StyleProfile) || null;
}

export async function getMatchedFrames(customerId: string) {
  const session = await verifyClientSession();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { familyId: true, styleProfile: true },
  });
  if (!customer || customer.familyId !== session.familyId) {
    return [];
  }

  const profile = customer.styleProfile as unknown as StyleProfile | null;
  if (!profile?.choices) return [];

  const select = {
    id: true,
    brand: true,
    model: true,
    color: true,
    material: true,
    rimType: true,
    retailPrice: true,
    imageUrl: true,
    styleTags: true,
  };

  // Try strict filters first
  let frames = await prisma.inventoryItem.findMany({
    where: buildFrameMatchFilters(profile.choices) as any,
    select,
    take: MAX_MATCHED_FRAMES,
    orderBy: { totalUnitsSold: "desc" },
  });

  // Broaden if too few results
  if (frames.length < MIN_RESULTS_BEFORE_BROADEN) {
    frames = await prisma.inventoryItem.findMany({
      where: buildBroadenedFilters(profile.choices) as any,
      select,
      take: MAX_MATCHED_FRAMES,
      orderBy: { totalUnitsSold: "desc" },
    });
  }

  return frames;
}

export async function getSavedFrameIds(
  customerId: string
): Promise<string[]> {
  const session = await verifyClientSession();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { familyId: true },
  });
  if (!customer || customer.familyId !== session.familyId) {
    return [];
  }

  const saved = await prisma.savedFrame.findMany({
    where: { customerId, inventoryItemId: { not: null } },
    select: { inventoryItemId: true },
  });

  return saved
    .map((s) => s.inventoryItemId)
    .filter((id): id is string => id !== null);
}

export async function toggleSaveFrameFromPortal(
  customerId: string,
  inventoryItemId: string
): Promise<{ saved: boolean } | { error: string }> {
  const session = await verifyClientSession();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { familyId: true },
  });
  if (!customer || customer.familyId !== session.familyId) {
    return { error: "Invalid family member." };
  }

  // Check if already saved
  const existing = await prisma.savedFrame.findFirst({
    where: { customerId, inventoryItemId },
  });

  if (existing) {
    await prisma.savedFrame.delete({ where: { id: existing.id } });
    return { saved: false };
  }

  // Look up inventory item for details
  const item = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    select: { brand: true, model: true, color: true, sku: true },
  });
  if (!item) {
    return { error: "Frame not found." };
  }

  await prisma.savedFrame.create({
    data: {
      customerId,
      inventoryItemId,
      brand: item.brand,
      model: item.model,
      color: item.color,
      sku: item.sku,
      savedBy: "self",
    },
  });

  return { saved: true };
}
