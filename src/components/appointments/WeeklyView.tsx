"use client";

import {
  SLOT_HEIGHT_PX,
  type CalendarAppointment,
} from "@/lib/types/appointment";
import { AppointmentCard } from "./AppointmentCard";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type BlockedTimeEntry = {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  providerId: string | null;
};

type WeeklyViewProps = {
  days: Date[];
  filteredAppointments: CalendarAppointment[];
  blockedTimes: BlockedTimeEntry[];
  selectedProviderId: string | null;
  calStartHour: number;
  calEndHour: number;
  isCurrentPeriod: boolean;
  currentTime: Date;
  onSlotClick: (dayIndex: number, slotIndex: number) => void;
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

export function WeeklyView({
  days,
  filteredAppointments,
  blockedTimes,
  selectedProviderId,
  calStartHour,
  calEndHour,
  isCurrentPeriod,
  currentTime,
  onSlotClick,
  onCardClick,
}: WeeklyViewProps) {
  const TOTAL_HOURS = calEndHour - calStartHour;
  const TOTAL_SLOTS = TOTAL_HOURS * 2;
  const TOTAL_HEIGHT_PX = TOTAL_SLOTS * SLOT_HEIGHT_PX;

  function appointmentsForDay(dayIndex: number) {
    const dayDate = days[dayIndex];
    return filteredAppointments.filter((a) => {
      const d = new Date(a.scheduledAt);
      return (
        d.getFullYear() === dayDate.getFullYear() &&
        d.getMonth() === dayDate.getMonth() &&
        d.getDate() === dayDate.getDate()
      );
    });
  }

  function blockedTimesForDay(dayIndex: number) {
    const dayDate = days[dayIndex];
    const dayStart = new Date(dayDate);
    dayStart.setHours(calStartHour, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(calEndHour, 0, 0, 0);

    return blockedTimes.filter((bt) => {
      const btStart = new Date(bt.startAt);
      const btEnd = new Date(bt.endAt);
      if (btStart >= dayEnd || btEnd <= dayStart) return false;
      if (bt.providerId && selectedProviderId && bt.providerId !== selectedProviderId) return false;
      return true;
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

  function getBlockedTimeStyle(
    bt: BlockedTimeEntry,
    dayDate: Date
  ): React.CSSProperties {
    const dayStart = new Date(dayDate);
    dayStart.setHours(calStartHour, 0, 0, 0);
    const dayEnd = new Date(dayDate);
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

  function isSlotBlocked(dayIndex: number, slotIndex: number): boolean {
    const day = days[dayIndex];
    const hour = calStartHour + Math.floor(slotIndex / 2);
    const minute = slotIndex % 2 === 0 ? 0 : 30;
    const slotStart = new Date(day);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setTime(slotEnd.getTime() + 30 * 60_000);

    const dayBlocked = blockedTimesForDay(dayIndex);
    return dayBlocked.some((bt) => {
      const btStart = new Date(bt.startAt);
      const btEnd = new Date(bt.endAt);
      return btStart <= slotStart && btEnd >= slotEnd;
    });
  }

  function isDayFullyBlocked(
    dayIndex: number
  ): { blocked: boolean; reason: string | null } {
    const dayDate = days[dayIndex];
    const dayStart = new Date(dayDate);
    dayStart.setHours(calStartHour, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(calEndHour, 0, 0, 0);

    const dayBlocked = blockedTimesForDay(dayIndex);
    const allDayBlock = dayBlocked.find((bt) => {
      const btStart = new Date(bt.startAt);
      const btEnd = new Date(bt.endAt);
      return btStart <= dayStart && btEnd >= dayEnd;
    });
    return { blocked: !!allDayBlock, reason: allDayBlock?.reason ?? null };
  }

  const currentTimeTop = isCurrentPeriod
    ? ((currentTime.getHours() - calStartHour) * 60 +
        currentTime.getMinutes()) /
      30 *
      SLOT_HEIGHT_PX
    : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
        <div /> {/* time gutter */}
        {days.map((day, i) => {
          const count = appointmentsForDay(i).length;
          const todayDay = isToday(day);
          const dayBlock = isDayFullyBlocked(i);
          return (
            <div
              key={i}
              className={`px-2 py-2.5 text-center border-l border-gray-200 ${dayBlock.blocked ? "bg-gray-100" : todayDay ? "bg-primary/5" : ""}`}
            >
              <p
                className={`text-xs font-medium ${dayBlock.blocked ? "text-gray-400" : todayDay ? "text-primary" : "text-gray-500"}`}
              >
                {DAY_NAMES[i]}
              </p>
              <p
                className={`text-base font-bold leading-tight ${dayBlock.blocked ? "text-gray-400" : todayDay ? "text-primary" : "text-gray-900"}`}
              >
                {day.getDate()}
              </p>
              {dayBlock.blocked ? (
                <span className="inline-block mt-0.5 text-[10px] font-semibold bg-gray-300 text-gray-600 rounded-full px-1.5">
                  {dayBlock.reason ?? "Blocked"}
                </span>
              ) : count > 0 ? (
                <span className="inline-block mt-0.5 text-[10px] font-semibold bg-gray-200 text-gray-600 rounded-full px-1.5">
                  {count}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Scrollable grid body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div
          className="grid grid-cols-[56px_repeat(7,1fr)] relative"
          style={{ height: TOTAL_HEIGHT_PX }}
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

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const dayAppts = appointmentsForDay(dayIndex);
            const overlaps = computeOverlaps(dayAppts);
            const todayDay = isToday(day);
            const dayBlocked = blockedTimesForDay(dayIndex);

            return (
              <div
                key={dayIndex}
                className={`relative border-l border-gray-200 ${todayDay ? "bg-primary/5" : ""}`}
              >
                {/* Slot lines + click targets */}
                {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => {
                  const blocked = isSlotBlocked(dayIndex, slotIndex);
                  return (
                    <div
                      key={slotIndex}
                      className={`absolute left-0 right-0 transition-colors ${slotIndex % 2 === 0 ? "border-t border-gray-200" : "border-t border-gray-100"} ${blocked ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-100/60"}`}
                      style={{
                        top: slotIndex * SLOT_HEIGHT_PX,
                        height: SLOT_HEIGHT_PX,
                      }}
                      onClick={() => onSlotClick(dayIndex, slotIndex)}
                    />
                  );
                })}

                {/* Blocked time overlays */}
                {dayBlocked.map((bt) => {
                  const style = getBlockedTimeStyle(bt, day);
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
                {isCurrentPeriod && currentTimeTop !== null && todayDay && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: currentTimeTop }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                      <div className="flex-1 h-px bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Appointment cards */}
                {dayAppts.map((appt) => {
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
