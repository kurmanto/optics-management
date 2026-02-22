"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { getAppointmentsForRange } from "@/lib/actions/appointments";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentActions } from "./AppointmentActions";
import { BookAppointmentModal } from "./BookAppointmentModal";
import {
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
  SLOT_HEIGHT_PX,
  type CalendarAppointment,
} from "@/lib/types/appointment";

const TOTAL_HOURS = CALENDAR_END_HOUR - CALENDAR_START_HOUR;
const TOTAL_SLOTS = TOTAL_HOURS * 2; // 30-min slots
const TOTAL_HEIGHT_PX = TOTAL_SLOTS * SLOT_HEIGHT_PX;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatWeekParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type Props = {
  initialAppointments: CalendarAppointment[];
  weekStart: string; // ISO date string of Monday
};

type ModalState =
  | { type: "none" }
  | { type: "book"; defaultScheduledAt?: string; defaultType?: string }
  | { type: "actions"; appointment: CalendarAppointment; anchorRect: DOMRect };

export function AppointmentCalendar({ initialAppointments, weekStart }: Props) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialAppointments);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [currentTime, setCurrentTime] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  const monday = new Date(weekStart + "T00:00:00");
  const today = getMondayOf(new Date());

  const isCurrentWeek =
    formatWeekParam(monday) === formatWeekParam(today);

  // Update current time every minute for the live indicator
  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // Reload appointments when weekStart changes (after router navigation)
  useEffect(() => {
    const start = new Date(weekStart + "T00:00:00");
    const end = addDays(start, 7);
    getAppointmentsForRange(start, end).then(setAppointments);
  }, [weekStart]);

  function navigateWeek(delta: number) {
    const newMonday = addDays(monday, delta * 7);
    router.push(`/appointments?week=${formatWeekParam(newMonday)}`);
  }

  function goToday() {
    router.push("/appointments");
  }

  const refresh = useCallback(async () => {
    const start = new Date(weekStart + "T00:00:00");
    const end = addDays(start, 7);
    const fresh = await getAppointmentsForRange(start, end);
    setAppointments(fresh);
  }, [weekStart]);

  // Build day columns (Mon=0, …, Sun=6)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  // Group appointments by day index
  function appointmentsForDay(dayIndex: number) {
    const dayDate = days[dayIndex];
    return appointments.filter((a) => {
      const d = new Date(a.scheduledAt);
      return (
        d.getFullYear() === dayDate.getFullYear() &&
        d.getMonth() === dayDate.getMonth() &&
        d.getDate() === dayDate.getDate()
      );
    });
  }

  // Compute position within the grid
  function getCardStyle(a: CalendarAppointment, overlapIndex: number, overlapTotal: number): React.CSSProperties {
    const start = new Date(a.scheduledAt);
    const minutesFromStart =
      (start.getHours() - CALENDAR_START_HOUR) * 60 + start.getMinutes();
    const topPx = (minutesFromStart / 30) * SLOT_HEIGHT_PX;
    const heightPx = Math.max((a.duration / 30) * SLOT_HEIGHT_PX, SLOT_HEIGHT_PX * 0.5);

    const widthFraction = overlapTotal > 1 ? 1 / overlapTotal : 1;
    const leftFraction = overlapIndex / overlapTotal;

    return {
      top: topPx,
      height: heightPx - 2,
      width: `calc(${widthFraction * 100}% - 4px)`,
      left: `calc(${leftFraction * 100}% + 2px)`,
    };
  }

  // Detect overlapping appointments in a day and assign indices
  function computeOverlaps(appts: CalendarAppointment[]): Map<string, { index: number; total: number }> {
    const result = new Map<string, { index: number; total: number }>();
    // Simple greedy: sort by start, then find overlapping groups
    const sorted = [...appts].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    const groups: CalendarAppointment[][] = [];
    for (const appt of sorted) {
      const apptStart = new Date(appt.scheduledAt).getTime();
      const apptEnd = apptStart + appt.duration * 60_000;
      let placed = false;
      for (const group of groups) {
        // Check if this overlaps any in the group
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

  // Current time indicator top offset (only for current week)
  const currentTimeTop = isCurrentWeek
    ? ((currentTime.getHours() - CALENDAR_START_HOUR) * 60 + currentTime.getMinutes()) /
      30 * SLOT_HEIGHT_PX
    : null;

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  };

  function handleSlotClick(dayIndex: number, slotIndex: number) {
    const day = days[dayIndex];
    const hour = CALENDAR_START_HOUR + Math.floor(slotIndex / 2);
    const minute = slotIndex % 2 === 0 ? 0 : 30;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dt = `${formatWeekParam(day)}T${pad(hour)}:${pad(minute)}`;
    setModal({ type: "book", defaultScheduledAt: dt });
  }

  function handleCardClick(
    appointment: CalendarAppointment,
    e: React.MouseEvent
  ) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setModal({ type: "actions", appointment, anchorRect: rect });
  }

  const monthLabel = (() => {
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) {
      return start.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
    }
    return `${start.toLocaleDateString("en-CA", { month: "short" })} – ${end.toLocaleDateString("en-CA", { month: "short", year: "numeric" })}`;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateWeek(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => navigateWeek(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 ml-1">{monthLabel}</h2>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={goToday}
              className="ml-2 px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setModal({ type: "book", defaultType: "STYLING" })}
          className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Book Styling
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
          <div /> {/* time gutter */}
          {days.map((day, i) => {
            const count = appointmentsForDay(i).length;
            const todayDay = isToday(day);
            return (
              <div
                key={i}
                className={`px-2 py-2.5 text-center border-l border-gray-200 ${todayDay ? "bg-primary/5" : ""}`}
              >
                <p className={`text-xs font-medium ${todayDay ? "text-primary" : "text-gray-500"}`}>
                  {DAY_NAMES[i]}
                </p>
                <p className={`text-base font-bold leading-tight ${todayDay ? "text-primary" : "text-gray-900"}`}>
                  {day.getDate()}
                </p>
                {count > 0 && (
                  <span className="inline-block mt-0.5 text-[10px] font-semibold bg-gray-200 text-gray-600 rounded-full px-1.5">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable grid body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div
            ref={gridRef}
            className="grid grid-cols-[56px_repeat(7,1fr)] relative"
            style={{ height: TOTAL_HEIGHT_PX }}
          >
            {/* Time labels */}
            <div className="relative border-r border-gray-200">
              {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
                const hour = CALENDAR_START_HOUR + Math.floor(i / 2);
                const minute = i % 2 === 0 ? "00" : "30";
                const isHour = i % 2 === 0;
                return (
                  <div
                    key={i}
                    className="absolute left-0 right-0 text-right pr-2"
                    style={{ top: i * SLOT_HEIGHT_PX - 7 }}
                  >
                    {isHour && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {hour}:{minute}
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

              return (
                <div
                  key={dayIndex}
                  className={`relative border-l border-gray-200 ${todayDay ? "bg-primary/5" : ""}`}
                >
                  {/* Slot lines + click targets */}
                  {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => (
                    <div
                      key={slotIndex}
                      className={`absolute left-0 right-0 cursor-pointer hover:bg-gray-100/60 transition-colors ${slotIndex % 2 === 0 ? "border-t border-gray-200" : "border-t border-gray-100"}`}
                      style={{ top: slotIndex * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
                      onClick={() => handleSlotClick(dayIndex, slotIndex)}
                    />
                  ))}

                  {/* Current time indicator */}
                  {isCurrentWeek && currentTimeTop !== null && todayDay && (
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
                    const ov = overlaps.get(appt.id) ?? { index: 0, total: 1 };
                    return (
                      <AppointmentCard
                        key={appt.id}
                        appointment={appt}
                        style={getCardStyle(appt, ov.index, ov.total)}
                        onClick={(e: React.MouseEvent) => handleCardClick(appt, e)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal.type === "book" && (
        <BookAppointmentModal
          defaultScheduledAt={modal.defaultScheduledAt}
          defaultType={modal.defaultType}
          onClose={() => setModal({ type: "none" })}
          onSuccess={() => {
            setModal({ type: "none" });
            refresh();
          }}
        />
      )}

      {modal.type === "actions" && (
        <AppointmentActions
          appointment={modal.appointment}
          anchorRect={modal.anchorRect}
          onClose={() => setModal({ type: "none" })}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
