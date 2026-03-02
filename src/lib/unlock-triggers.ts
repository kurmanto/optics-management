import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TriggerRule =
  | { type: "STYLE_QUIZ_COMPLETED" }
  | { type: "REFERRAL_COUNT"; threshold: number }
  | { type: "ORDER_COUNT"; threshold: number }
  | { type: "APPOINTMENT_BOOKED" };

/**
 * Evaluate all LOCKED cards with a triggerRule for a family.
 * Unlocks qualifying cards. Fire-and-forget — never throws.
 */
export async function checkAndUnlockCards(familyId: string): Promise<void> {
  try {
    const lockedCards = await prisma.unlockCard.findMany({
      where: {
        familyId,
        status: "LOCKED",
        triggerRule: { not: Prisma.DbNull },
      },
      select: {
        id: true,
        triggerRule: true,
        progressGoal: true,
      },
    });

    if (lockedCards.length === 0) return;

    // Prefetch family state needed by triggers
    const memberIds = await prisma.customer
      .findMany({ where: { familyId, isActive: true }, select: { id: true, styleProfile: true } })
      .then((cs) => cs);

    for (const card of lockedCards) {
      const rule = card.triggerRule as unknown as TriggerRule;
      if (!rule || !rule.type) continue;

      const result = await evaluateRule(rule, familyId, memberIds);

      if (result.met) {
        await prisma.unlockCard.update({
          where: { id: card.id },
          data: {
            status: "UNLOCKED",
            unlockedAt: new Date(),
            unlockedBy: "system",
            ...(result.progress !== undefined ? { progress: result.progress } : {}),
          },
        });
      } else if (result.progress !== undefined) {
        // Update progress even if not yet met
        await prisma.unlockCard.update({
          where: { id: card.id },
          data: { progress: result.progress },
        });
      }
    }
  } catch (err) {
    console.error("[unlock-triggers] Error evaluating triggers:", err);
  }
}

type EvalResult = { met: boolean; progress?: number };

type MemberRow = { id: string; styleProfile: unknown };

async function evaluateRule(
  rule: TriggerRule,
  familyId: string,
  members: MemberRow[]
): Promise<EvalResult> {
  const memberIds = members.map((m) => m.id);

  switch (rule.type) {
    case "STYLE_QUIZ_COMPLETED": {
      const hasProfile = members.some((m) => m.styleProfile != null);
      return { met: hasProfile };
    }

    case "REFERRAL_COUNT": {
      const count = await prisma.referral.count({
        where: {
          referrerId: { in: memberIds },
          status: { in: ["QUALIFIED", "REWARDED"] },
        },
      });
      return { met: count >= rule.threshold, progress: count };
    }

    case "ORDER_COUNT": {
      const count = await prisma.order.count({
        where: {
          customerId: { in: memberIds },
          status: "PICKED_UP",
        },
      });
      return { met: count >= rule.threshold, progress: count };
    }

    case "APPOINTMENT_BOOKED": {
      const future = await prisma.appointment.findFirst({
        where: {
          customerId: { in: memberIds },
          scheduledAt: { gte: new Date() },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
      });
      return { met: future !== null };
    }

    default:
      return { met: false };
  }
}
