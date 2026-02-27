import { getUnlockCards } from "@/lib/actions/client-portal";
import { UnlockCardGrid } from "@/components/client/unlocks/UnlockCardGrid";
import { Trophy } from "lucide-react";

export default async function UnlocksPage() {
  const cards = await getUnlockCards();

  const unlockedCount = cards.filter((c) => c.status === "UNLOCKED").length;
  const totalCount = cards.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Unlock Cards</h1>
            <p className="text-sm text-gray-500">
              {unlockedCount} of {totalCount} unlocked
            </p>
          </div>
        </div>
      </div>

      <UnlockCardGrid cards={cards} />
    </div>
  );
}
