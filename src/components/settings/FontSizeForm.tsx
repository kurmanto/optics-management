"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateFontSizePreference } from "@/lib/actions/user-preferences";
import { cn } from "@/lib/utils/cn";

type FontSize = "SMALL" | "MEDIUM" | "LARGE";

const OPTIONS: { value: FontSize; label: string }[] = [
  { value: "SMALL", label: "Small" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LARGE", label: "Large" },
];

export function FontSizeForm({ initialSize }: { initialSize: FontSize }) {
  const router = useRouter();
  const [active, setActive] = useState<FontSize>(initialSize);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(size: FontSize) {
    const previous = active;
    setActive(size);
    setError(null);

    const result = await updateFontSizePreference(size);
    if (result.error) {
      setActive(previous);
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleSelect(value)}
            className={cn(
              "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              active === value
                ? "bg-primary text-white border-primary ring-2 ring-primary ring-offset-1"
                : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
