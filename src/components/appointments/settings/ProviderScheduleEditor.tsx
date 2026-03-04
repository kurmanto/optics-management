"use client";

import { useState, useTransition } from "react";
import {
  setProviderAvailability,
  removeProviderAvailability,
} from "@/lib/actions/appointment-settings";

type Availability = {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type Provider = {
  id: string;
  name: string;
  isActive: boolean;
  availability: Availability[];
};

type Props = { providers: Provider[] };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProviderScheduleEditor({ providers }: Props) {
  const activeProviders = providers.filter((p) => p.isActive);
  const [selectedProviderId, setSelectedProviderId] = useState(activeProviders[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProvider = activeProviders.find((p) => p.id === selectedProviderId);
  const availMap = new Map(
    selectedProvider?.availability.map((a) => [a.dayOfWeek, a]) ?? []
  );

  function handleSet(dayOfWeek: number, startTime: string, endTime: string) {
    setError(null);
    startTransition(async () => {
      const result = await setProviderAvailability({
        providerId: selectedProviderId,
        dayOfWeek,
        startTime,
        endTime,
        isActive: true,
      });
      if ("error" in result) setError(result.error);
    });
  }

  function handleRemove(dayOfWeek: number) {
    startTransition(async () => {
      await removeProviderAvailability(selectedProviderId, dayOfWeek);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Provider Schedules</h2>

      {activeProviders.length === 0 ? (
        <p className="text-sm text-gray-400">No active providers to configure.</p>
      ) : (
        <>
          <select
            value={selectedProviderId}
            onChange={(e) => { setSelectedProviderId(e.target.value); setError(null); }}
            className="border rounded-lg px-3 py-2 text-sm mb-4"
          >
            {activeProviders.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <div className="space-y-2">
            {DAYS.map((dayName, idx) => {
              const avail = availMap.get(idx);
              return (
                <DayRow
                  key={idx}
                  dayName={dayName}
                  dayAbbr={DAY_ABBR[idx]}
                  dayOfWeek={idx}
                  startTime={avail?.startTime ?? "09:00"}
                  endTime={avail?.endTime ?? "17:00"}
                  isSet={!!avail}
                  isPending={isPending}
                  onSet={handleSet}
                  onRemove={handleRemove}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function DayRow({
  dayName,
  dayAbbr,
  dayOfWeek,
  startTime: defaultStart,
  endTime: defaultEnd,
  isSet,
  isPending,
  onSet,
  onRemove,
}: {
  dayName: string;
  dayAbbr: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isSet: boolean;
  isPending: boolean;
  onSet: (day: number, start: string, end: string) => void;
  onRemove: (day: number) => void;
}) {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="w-10 text-xs font-medium text-gray-500">{dayAbbr}</span>

      {isSet ? (
        <>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => onSet(dayOfWeek, start, end)}
            disabled={isPending}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => onRemove(dayOfWeek)}
            disabled={isPending}
            className="text-xs text-red-500 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <span className="text-xs text-gray-400 flex-1">{dayName} &mdash; Off</span>
          <button
            type="button"
            onClick={() => onSet(dayOfWeek, "09:00", "17:00")}
            disabled={isPending}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            + Add Hours
          </button>
        </>
      )}
    </div>
  );
}
