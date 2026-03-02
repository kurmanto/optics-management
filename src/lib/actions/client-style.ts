"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyClientSession } from "@/lib/client-dal";
import { StyleQuizSchema } from "@/lib/validations/client-portal";
import {
  computeStyleLabel,
  type StyleChoice,
  type StyleProfile,
} from "@/lib/utils/style-quiz";
import { scoreFrame, type FrameData, type ScoreResult } from "@/lib/utils/frame-scoring";
import { checkAndUnlockCards } from "@/lib/unlock-triggers";
import { awardPoints } from "@/lib/gamification";

const MAX_MATCHED_FRAMES = 12;
const MIN_SCORE = 20;

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
    select: { familyId: true, styleProfile: true },
  });
  if (!customer || customer.familyId !== session.familyId) {
    return { error: "Invalid family member." };
  }

  const hadProfileBefore = customer.styleProfile != null;

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

  // Award points only on first quiz completion (not retakes)
  if (!hadProfileBefore && customer.familyId) {
    void awardPoints(customer.familyId, 50, "Style Quiz Completed", customerId, "Customer");
  }

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

export type MatchedFrameResult = {
  id: string;
  brand: string;
  model: string;
  color: string | null;
  material: string | null;
  rimType: string | null;
  retailPrice: number | null;
  imageUrl: string | null;
  styleTags: string[];
  score: number;
  matchReasons: string[];
};

export async function getMatchedFrames(customerId: string): Promise<MatchedFrameResult[]> {
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

  // Fetch all in-stock active frames (broad query)
  const frames = await prisma.inventoryItem.findMany({
    where: {
      isActive: true,
      stockQuantity: { gt: 0 },
    },
    select: {
      id: true,
      brand: true,
      model: true,
      color: true,
      material: true,
      rimType: true,
      retailPrice: true,
      imageUrl: true,
      styleTags: true,
      eyeSize: true,
      totalUnitsSold: true,
      staffPickStyleLabels: true,
    },
  });

  // Find max sold for popularity normalization
  const maxSold = frames.reduce((max, f) => Math.max(max, f.totalUnitsSold), 0);

  // Score each frame
  const scored = frames.map((f) => {
    const frameData: FrameData = {
      material: f.material,
      styleTags: f.styleTags,
      rimType: f.rimType,
      color: f.color,
      eyeSize: f.eyeSize,
      totalUnitsSold: f.totalUnitsSold,
      staffPickStyleLabels: f.staffPickStyleLabels,
    };
    const result = scoreFrame(frameData, profile.choices, profile.label, maxSold);
    return {
      id: f.id,
      brand: f.brand,
      model: f.model,
      color: f.color,
      material: f.material,
      rimType: f.rimType,
      retailPrice: f.retailPrice,
      imageUrl: f.imageUrl,
      styleTags: f.styleTags,
      score: result.score,
      matchReasons: result.matchReasons,
    };
  });

  // Filter, sort, take top N
  return scored
    .filter((f) => f.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHED_FRAMES);
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
