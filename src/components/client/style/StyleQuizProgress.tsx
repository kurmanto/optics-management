interface StyleQuizProgressProps {
  currentRound: number;
  totalRounds: number;
}

export function StyleQuizProgress({ currentRound, totalRounds }: StyleQuizProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalRounds }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i < currentRound
              ? "bg-primary"
              : i === currentRound
              ? "bg-primary/50"
              : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}
