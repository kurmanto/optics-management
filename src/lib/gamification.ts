import { prisma } from "@/lib/prisma";
import { createClientNotificationForFamily } from "@/lib/client-notifications";

// ── Tier thresholds ─────────────────────────────────────────────────
// Bronze: 0-499, Silver: 500-1499, Gold: 1500+

const TIER_THRESHOLDS = [0, 500, 1500]; // index = tier level

function computeTierLevel(totalPoints: number): number {
  if (totalPoints >= TIER_THRESHOLDS[2]) return 2; // Gold
  if (totalPoints >= TIER_THRESHOLDS[1]) return 1; // Silver
  return 0; // Bronze
}

const TIER_NAMES = ["Bronze", "Silver", "Gold"];

// ── Award points ────────────────────────────────────────────────────

type AwardResult = {
  newTotal: number;
  tierUpgraded: boolean;
  newTierLevel?: number;
};

/**
 * Award points to a family. Updates points total, checks for tier upgrades,
 * sends notifications. Fire-and-forget — never throws to caller.
 */
export async function awardPoints(
  familyId: string,
  points: number,
  reason: string,
  refId?: string,
  refType?: string
): Promise<AwardResult | null> {
  try {
    // Transaction: create ledger entry + update family total
    const result = await prisma.$transaction(async (tx) => {
      await tx.pointsLedger.create({
        data: {
          familyId,
          points,
          reason,
          refId: refId ?? null,
          refType: refType ?? null,
        },
      });

      const family = await tx.family.update({
        where: { id: familyId },
        data: { tierPointsTotal: { increment: points } },
        select: { tierPointsTotal: true, tierLevel: true },
      });

      const newTierLevel = computeTierLevel(family.tierPointsTotal);
      const tierUpgraded = newTierLevel > family.tierLevel;

      if (tierUpgraded) {
        await tx.family.update({
          where: { id: familyId },
          data: { tierLevel: newTierLevel },
        });

        // Create milestone unlock card for the new tier
        await tx.unlockCard.create({
          data: {
            familyId,
            type: "TIER_MILESTONE",
            title: `${TIER_NAMES[newTierLevel]} Welcome`,
            description: `Congratulations on reaching ${TIER_NAMES[newTierLevel]} status!`,
            status: "UNLOCKED",
            unlockedAt: new Date(),
            unlockedBy: "system",
          },
        });
      }

      return {
        newTotal: family.tierPointsTotal,
        tierUpgraded,
        newTierLevel: tierUpgraded ? newTierLevel : undefined,
      };
    });

    // Notifications (fire-and-forget, outside transaction)
    void createClientNotificationForFamily({
      familyId,
      type: "POINTS_EARNED",
      title: `+${points} Vision Points`,
      body: reason,
      href: "/my/points",
      sendEmail: false,
    });

    if (result.tierUpgraded && result.newTierLevel !== undefined) {
      void createClientNotificationForFamily({
        familyId,
        type: "TIER_UPGRADED",
        title: `${TIER_NAMES[result.newTierLevel]} Status!`,
        body: `You've been upgraded to ${TIER_NAMES[result.newTierLevel]}! Check your unlocks for a welcome reward.`,
        href: "/my/unlocks",
        sendEmail: true,
      });
    }

    return result;
  } catch (err) {
    console.error("[awardPoints] Error:", err);
    return null;
  }
}
