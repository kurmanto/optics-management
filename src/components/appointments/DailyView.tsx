"use client";

import {
  SLOT_HEIGHT_PX,
  type CalendarAppointment,
} from "@/lib/types/appointment";
import { AppointmentCard } from "./AppointmentCard";

type BlockedTimeEntry = {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  providerId: string | null;
};

type ProviderOption = {
  id: string;
  name: string;
  title: string;
  isOD: boolean;
};

type DailyViewProps = {
  day: Date;
  filteredAppointments: CalendarAppointment[];
  blockedTimes: BlockedTimeEntry[];
  selectedProviderId: string | null;
  providers: ProviderOption[];
  calStartHour: number;
  calEndHour: number;
  isCurrentPeriod: boolean;
  currentTime: Date;
  onSlotClick: (dayIndex: number, slotIndex: number, providerId?: string) => void;
  onCardClick: (appt: CalendarAppointment, e: React.MouseEvent) => void;
};

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function DailyView({
  day,
  filteredAppointments,
  blockedTimes,
  selectedProviderId,
  providers,
  calStartHour,
  calEndHour,
  isCurrentPeriod,
  currentTime,
  onSlotClick,
  onCardClick,
}: DailyViewProps) {
  const TOTAL_HOURS = calEndHour - calStartHour;
  const TOTAL_SLOTS = TOTAL_HOURS * 2;
  const TOTAL_HEIGHT_PX = TOTAL_SLOTS * SLOT_HEIGHT_PX;
  const todayDay = isToday(day);

  // Determine columns: if a provider is selected, show single column; otherwise show provider columns
  const showProviderColumns = !selectedProviderId && providers.length > 1;
  const columns = showProviderColumns
    ? providers
    : [{ id: selectedProviderId ?? "__all__", name: "All", title: "", isOD: false }];

  function appointmentsForColumn(providerId: string) {
    if (providerId === "__all__") return filteredAppointments;
    return filteredAppointments.filter(
      (a) => a.providerId === providerId || a.providerId === null
    );
  }

  function blockedTimesForColumn(providerId: string) {
    const dayStart = new Date(day);
    dayStart.setHours(calStartHour, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(calEndHour, 0, 0, 0);

    return blockedTimes.filter((bt) => {
      const btStart = new Date(bt.startAt);
      const btEnd = new Date(bt.endAt);
      if (btStart >= dayEnd || btEnd <= dayStart) return false;
      // Clinic-wide blocks show in all columns
      if (!bt.providerId) return true;
      // Provider-specific: show only in that provider's column
      if (providerId === "__all__") {
        // In single-column mode, show all provider blocks if matching filter
        if (selectedProviderId && bt.providerId !== selectedProviderId) return false;
        return true;
      }
      return bt.providerId === providerId;
    });
  }

  function getCardStyle(
    a: CalendarAppointment,
    overlapIndex: number,
    overlapTotal: number
  ): React.CSSProperties {
    const start = new Date(a.scheduledAt);
    const minutesFromStart =
      (start.getHours() - calStartHour) * 60 + start.getMinutes();
    const topPx = (minutesFromStart / 30) * SLOT_HEIGHT_PX;
    const heightPx = Math.max(
      (a.duration / 30) * SLOT_HEIGHT_PX,
      SLOT_HEIGHT_PX * 0.5
    );

    const widthFraction = overlapTotal > 1 ? 1 / overlapTotal : 1;
    const leftFraction = overlapIndex / overlapTotal;

    return {
      top: topPx,
      height: heightPx - 2,
      width: `calc(${widthFraction * 100}% - 4px)`,
      left: `calc(${leftFraction * 100}% + 2px)`,
    };
  }

  function getBlockedTimeStyle(bt: BlockedTimeEntry): React.CSSProperties {
    const dayStart = new Date(day);
    dayStart.setHours(calStartHour, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(calEndHour, 0, 0, 0);

    const btStart = new Date(
      Math.max(new Date(bt.startAt).getTime(), dayStart.getTime())
    );
    const btEnd = new Date(
      Math.min(new Date(bt.endAt).getTime(), dayEnd.getTime())
    );

    const startMinutes =
      (btStart.getHours() - calStartHour) * 60 + btStart.getMinutes();
    const endMinutes =
      (btEnd.getHours() - calStartHour) * 60 + btEnd.getMinutes();

    return {
      top: (startMinutes / 30) * SLOT_HEIGHT_PX,
      height: ((endMinutes - startMinutes) / 30) * SLOT_HEIGHT_PX,
    };
  }

  function computeOverlaps(
    appts: CalendarAppointment[]
  ): Map<string, { index: number; total: number }> {
    const result = new Map<string, { index: number; total: number }>();
    const sorted = [...appts].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    const groups: CalendarAppointment[][] = [];
    for (const appt of sorted) {
      const apptStart = new Date(appt.scheduledAt).getTime();
      const apptEnd = apptStart + appt.duration * 60_000;
      let placed = false;
      for (const group of groups) {
        const overlaps = group.some((g) => {
          const gStart = new Date(g.scheduledAt).getTime();
          const gEnd = gStart + g.duration * 60_000;
          return apptStart < gEnd && apptEnd > gStart;
        });
        if (overlaps) {
          group.push(appt);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([appt]);
    }

    for (const group of groups) {
      group.forEach((appt, idx) => {
        result.set(appt.id, { index: idx, total: group.length });
      });
    }

    return result;
  }

  function isSlotBlocked(colProviderId: string, slotIndex: number): boolean {
    const hour = calStartHour + Math.floor(slotIndex / 2);
    const minute = slotIndex % 2 === 0 ? 0 : 30;
    const slotStart = new Date(day);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setTime(slotEnd.getTime() + 30 * 60_000);

    const colBlocked = blockedTimesForColumn(colProviderId);
    return colBlocked.some((bt) => {
      const btStart = new Date(bt.startAt);
      const btEnd = new Date(bt.endAt);
      return btStart <= slotStart && btEnd >= slotEnd;
    });
  }

  const currentTimeTop =
    isCurrentPeriod && todayDay
      ? ((currentTime.getHours() - calStartHour) * 60 +
          currentTime.getMinutes()) /
        30 *
        SLOT_HEIGHT_PX
      : null;

  const colCount = columns.length;
  const gridCols = `56px repeat(${colCount}, 1fr)`;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Column headers */}
      <div
        className="grid border-b border-gray-200 bg-gray-50"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div /> {/* time gutter */}
        {columns.map((col) => (
          <div
            key={col.id}
            className={`text-center border-l border-gray-200 py-2 ${todayDay ? "bg-primary/5" : ""}`}
          >
            {showProviderColumns ? (
              <>
                <p className="text-xs font-semibold text-gray-700">{col.name}</p>
                <p className="text-[10px] text-gray-400">{col.title}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-500">
                  {day.toLocaleDateString("en-CA", { weekday: "short" })}
                </p>
                <p className="text-base font-bold text-gray-900">
                  {day.getDate()}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Scrollable grid body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div
          className="grid relative"
          style={{ gridTemplateColumns: gridCols, height: TOTAL_HEIGHT_PX }}
        >
          {/* Time labels */}
          <div className="relative border-r border-gray-200">
            {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
              const hour = calStartHour + Math.floor(i / 2);
              const isHour = i % 2 === 0;
              return (
                <div
                  key={i}
                  className="absolute left-0 right-0 text-right pr-2"
                  style={{ top: i * SLOT_HEIGHT_PX - 7 }}
                >
                  {isHour && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      {hour}:00
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Provider / day columns */}
          {columns.map((col, colIndex) => {
            const colAppts = appointmentsForColumn(col.id);
            const overlaps = computeOverlaps(colAppts);
            const colBlocked = blockedTimesForColumn(col.id);

            return (
              <div
                key={col.id}
                className={`relative border-l border-gray-200 ${todayDay ? "bg-primary/5" : ""}`}
              >
                {/* Slot lines + click targets */}
                {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => {
                  const blocked = isSlotBlocked(col.id, slotIndex);
                  return (
                    <div
                      key={slotIndex}
                      className={`absolute left-0 right-0 transition-colors ${slotIndex % 2 === 0 ? "border-t border-gray-200" : "border-t border-gray-100"} ${blocked ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-100/60"}`}
                      style={{
                        top: slotIndex * SLOT_HEIGHT_PX,
                        height: SLOT_HEIGHT_PX,
                      }}
                      onClick={() => {
                        if (!blocked) {
                          onSlotClick(
                            0,
                            slotIndex,
                            showProviderColumns ? col.id : undefined
                          );
                        }
                      }}
                    />
                  );
                })}

                {/* Blocked time overlays */}
                {colBlocked.map((bt) => {
                  const style = getBlockedTimeStyle(bt);
                  const heightNum =
                    typeof style.height === "number" ? style.height : 0;
                  const showLabel = heightNum >= SLOT_HEIGHT_PX;
                  return (
                    <div
                      key={bt.id}
                      className="absolute left-0 right-0 z-[3] cursor-not-allowed rounded-sm overflow-hidden"
                      style={{
                        ...style,
                        background:
                          "repeating-linear-gradient(45deg, rgba(156,163,175,0.25), rgba(156,163,175,0.25) 4px, rgba(209,213,219,0.25) 4px, rgba(209,213,219,0.25) 8px)",
                      }}
                      title={bt.reason ?? "Blocked"}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {showLabel && (
                        <div className="px-1.5 py-1 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-gray-500 truncate">
                            {bt.reason ?? "Blocked"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {currentTimeTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: currentTimeTop }}
                  >
                    <div className="flex items-center">
                      {colIndex === 0 && (
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                      )}
                      <div className="flex-1 h-px bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Appointment cards */}
                {colAppts.map((appt) => {
                  const ov = overlaps.get(appt.id) ?? {
                    index: 0,
                    total: 1,
                  };
                  return (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      style={getCardStyle(appt, ov.index, ov.total)}
                      onClick={(e: React.MouseEvent) => onCardClick(appt, e)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
