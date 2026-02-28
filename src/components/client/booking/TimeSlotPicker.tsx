"use client";

import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

interface TimeSlotPickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  slots: { time: string; available: boolean }[];
  selectedSlot: string;
  onSlotSelect: (time: string) => void;
  loading: boolean;
}

export function TimeSlotPicker({
  selectedDate,
  onDateChange,
  slots,
  selectedSlot,
  onSlotSelect,
  loading,
}: TimeSlotPickerProps) {
  // Default min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // Max date = 90 days out
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Select Date
        </label>
        <input
          id="date"
          type="date"
          value={selectedDate}
          min={minDate}
          max={maxDateStr}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Available Times</p>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : slots.filter((s) => s.available).length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No available slots for this date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots
                .filter((s) => s.available)
                .map((slot) => {
                  const time = new Date(slot.time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => onSlotSelect(slot.time)}
                      className={cn(
                        "rounded-lg border py-2 px-1 text-xs font-medium transition-colors",
                        selectedSlot === slot.time
                          ? "border-primary bg-primary text-white"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
