"use client";

export interface QuizOption {
  value: string;
  label: string;
  description?: string;
}

interface QuizQuestionProps {
  question: string;
  subtitle?: string;
  options: QuizOption[];
  selected: string | null;
  onSelect: (value: string) => void;
}

export function QuizQuestion({ question, subtitle, options, selected, onSelect }: QuizQuestionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">{question}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-2.5">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
              selected === option.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="font-medium text-gray-900 text-sm">{option.label}</div>
            {option.description && (
              <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
