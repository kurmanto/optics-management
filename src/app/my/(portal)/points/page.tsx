import { verifyClientSession } from "@/lib/client-dal";
import { prisma } from "@/lib/prisma";
import { PointsHistoryList } from "@/components/client/dashboard/PointsHistoryList";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Points History — Mint Vision Optique" };

export default async function PointsHistoryPage() {
  const session = await verifyClientSession();

  const [family, entries] = await Promise.all([
    prisma.family.findUnique({
      where: { id: session.familyId },
      select: { tierPointsTotal: true, tierLevel: true },
    }),
    prisma.pointsLedger.findMany({
      where: { familyId: session.familyId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        points: true,
        reason: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/my"
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Vision Points</h1>
          <p className="text-sm text-gray-500">
            {family?.tierPointsTotal ?? 0} total points
          </p>
        </div>
      </div>

      <PointsHistoryList entries={entries} />
    </div>
  );
}
