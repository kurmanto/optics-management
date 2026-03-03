"use client";

interface QuizProgressProps {
  current: number;
  total: number;
}

export function QuizProgress({ current, total }: QuizProgressProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i < current ? "bg-primary" : i === current ? "bg-primary/60" : "bg-gray-200"
          }`}
        />
      ))}
      <span className="ml-2 text-xs text-gray-400">
        {current + 1} of {total}
      </span>
    </div>
  );
}
