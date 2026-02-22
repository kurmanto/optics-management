"use client";

import { useState, useTransition } from "react";
import { Monitor, CheckCircle, Loader2, X } from "lucide-react";
import { markAsDisplayed, removeFromDisplay } from "@/lib/actions/inventory";

type Props = {
  inventoryItemId: string;
  isDisplayed: boolean;
  displayedAt: Date | null;
  displayLocation: string | null;
};

export function MarkDisplayedButton({ inventoryItemId, isDisplayed, displayedAt, displayLocation }: Props) {
  const [pending, startTransition] = useTransition();
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [location, setLocation] = useState(displayLocation ?? "");

  function handleMarkDisplayed() {
    if (showLocationInput) {
      startTransition(async () => {
        await markAsDisplayed(inventoryItemId, location || undefined);
        setShowLocationInput(false);
      });
    } else {
      setShowLocationInput(true);
    }
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromDisplay(inventoryItemId);
    });
  }

  if (isDisplayed) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>
            Displayed {displayedAt ? new Date(displayedAt).toLocaleDateString("en-CA") : ""}
            {displayLocation && ` · ${displayLocation}`}
          </span>
        </div>
        <button
          onClick={handleRemove}
          disabled={pending}
          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          title="Remove from display"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {showLocationInput && (
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (e.g. Wall A – Shelf 3)"
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleMarkDisplayed()}
        />
      )}
      <div className="flex gap-1.5">
        <button
          onClick={handleMarkDisplayed}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-xs bg-primary text-white px-2.5 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Monitor className="w-3 h-3" />}
          {showLocationInput ? "Confirm" : "Mark Displayed"}
        </button>
        {showLocationInput && (
          <button
            onClick={() => setShowLocationInput(false)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
