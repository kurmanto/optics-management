import { UnlockCardItem } from "./UnlockCardItem";

interface Card {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  value: number | null;
  valueType: string | null;
  progress: number | null;
  progressGoal: number | null;
  unlockedAt: Date | null;
  expiresAt: Date | null;
  customer: { firstName: string } | null;
}

interface UnlockCardGridProps {
  cards: Card[];
}

export function UnlockCardGrid({ cards }: UnlockCardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No unlock cards yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          Keep visiting Mint Vision to earn rewards!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {cards.map((card) => (
        <UnlockCardItem
          key={card.id}
          title={card.title}
          description={card.description}
          status={card.status}
          value={card.value}
          valueType={card.valueType}
          progress={card.progress}
          progressGoal={card.progressGoal}
          customerName={card.customer?.firstName ?? null}
          expiresAt={card.expiresAt}
        />
      ))}
    </div>
  );
}
