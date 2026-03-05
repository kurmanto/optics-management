"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { getAppointmentsForRange, getBlockedTimesForRange } from "@/lib/actions/appointments";
import { AppointmentActions } from "./AppointmentActions";
import { BookAppointmentModal } from "./BookAppointmentModal";
import { WeeklyView } from "./WeeklyView";
import { DailyView } from "./DailyView";
import { MonthlyView } from "./MonthlyView";
import {
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
  type CalendarAppointment,
  type CalendarViewType,
} from "@/lib/types/appointment";

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

type ServiceTypeOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration: number;
  color: string;
  bgColor: string;
  requiresOD: boolean;
  isActive: boolean;
};

type ProviderAvailabilityEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type ProviderOption = {
  id: string;
  name: string;
  title: string;
  isOD: boolean;
  availability?: ProviderAvailabilityEntry[];
};

type BlockedTimeEntry = {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  providerId: string | null;
};

type Props = {
  initialAppointments: CalendarAppointment[];
  weekStart: string;
  serviceTypes?: ServiceTypeOption[];
  providers?: ProviderOption[];
  blockedTimes?: BlockedTimeEntry[];
  initialView?: CalendarViewType;
  dayDate?: string;
  monthStart?: string;
};

type ModalState =
  | { type: "none" }
  | { type: "book"; defaultScheduledAt?: string; defaultType?: string; defaultProviderId?: string | null }
  | { type: "actions"; appointment: CalendarAppointment; anchorRect: DOMRect };

function parseTimeToHour(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + (m || 0) / 60;
}

function computeCalendarBounds(
  providers: ProviderOption[],
  selectedProviderId: string | null
): { startHour: number; endHour: number } {
  const relevantProviders = selectedProviderId
    ? providers.filter((p) => p.id === selectedProviderId)
    : providers;

  const allAvail = relevantProviders.flatMap((p) => p.availability ?? []);

  if (allAvail.length === 0) {
    return { startHour: CALENDAR_START_HOUR, endHour: CALENDAR_END_HOUR };
  }

  let minStart = 24;
  let maxEnd = 0;
  for (const a of allAvail) {
    const start = parseTimeToHour(a.startTime);
    const end = parseTimeToHour(a.endTime);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }

  return {
    startHour: Math.floor(minStart),
    endHour: Math.ceil(maxEnd),
  };
}

function isDateToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function AppointmentCalendar({
  initialAppointments,
  weekStart,
  serviceTypes = [],
  providers = [],
  blockedTimes: initialBlockedTimes = [],
  initialView = "week",
  dayDate,
  monthStart,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<CalendarViewType>(initialView);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialAppointments);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTimeEntry[]>(initialBlockedTimes);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  // Date context for each view
  const monday = new Date(weekStart + "T00:00:00");
  const currentDayDate = dayDate ? new Date(dayDate + "T00:00:00") : new Date();
  const [currentMonthYear, currentMonthNum] = (monthStart ?? formatMonthParam(new Date()))
    .split("-")
    .map(Number);

  const { startHour: calStartHour, endHour: calEndHour } = computeCalendarBounds(
    providers,
    selectedProviderId
  );

  // Sync state from server props (useState only uses initial value on mount)
  useEffect(() => { setView(initialView); }, [initialView]);
  useEffect(() => { setAppointments(initialAppointments); }, [initialAppointments]);
  useEffect(() => { setBlockedTimes(initialBlockedTimes); }, [initialBlockedTimes]);

  // Update current time every minute
  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        modal.type !== "none"
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "d" || key === "1") {
        e.preventDefault();
        switchView("day");
      } else if (key === "w" || key === "2") {
        e.preventDefault();
        switchView("week");
      } else if (key === "m" || key === "3") {
        e.preventDefault();
        switchView("month");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal.type, view, weekStart, dayDate, monthStart]);

  // Filter appointments by provider
  const filteredAppointments = selectedProviderId
    ? appointments.filter((a) => a.providerId === selectedProviderId)
    : appointments;

  // Navigation
  function navigatePeriod(delta: number) {
    if (view === "day") {
      const current = dayDate ? new Date(dayDate + "T00:00:00") : new Date();
      const next = addDays(current, delta);
      router.push(`/appointments?view=day&date=${formatDateParam(next)}`);
    } else if (view === "week") {
      const newMonday = addDays(monday, delta * 7);
      router.push(`/appointments?week=${formatDateParam(newMonday)}`);
    } else {
      const current = new Date(currentMonthYear, currentMonthNum - 1, 1);
      current.setMonth(current.getMonth() + delta);
      router.push(`/appointments?view=month&month=${formatMonthParam(current)}`);
    }
  }

  function goToday() {
    if (view === "day") {
      router.push(`/appointments?view=day&date=${formatDateParam(new Date())}`);
    } else if (view === "week") {
      router.push("/appointments");
    } else {
      router.push(`/appointments?view=month&month=${formatMonthParam(new Date())}`);
    }
  }

  function switchView(newView: CalendarViewType) {
    if (newView === view) return;

    if (newView === "day") {
      // Week → Day: use today if within current week, else Monday
      // Month → Day: use today
      let targetDate: Date;
      if (view === "week") {
        const today = new Date();
        const weekEnd = addDays(monday, 7);
        if (today >= monday && today < weekEnd) {
          targetDate = today;
        } else {
          targetDate = monday;
        }
      } else {
        targetDate = new Date();
      }
      router.push(`/appointments?view=day&date=${formatDateParam(targetDate)}`);
    } else if (newView === "week") {
      // Day → Week: use Monday of that day's week
      // Month → Week: use current week or first of month
      let targetMonday: Date;
      if (view === "day") {
        targetMonday = getMondayOf(currentDayDate);
      } else {
        targetMonday = getMondayOf(new Date());
      }
      router.push(`/appointments?week=${formatDateParam(targetMonday)}`);
    } else {
      // Day/Week → Month: use month containing current date context
      let targetDate: Date;
      if (view === "day") {
        targetDate = currentDayDate;
      } else {
        targetDate = monday;
      }
      router.push(`/appointments?view=month&month=${formatMonthParam(targetDate)}`);
    }
  }

  const refresh = useCallback(async () => {
    let start: Date;
    let end: Date;

    if (view === "day") {
      start = new Date((dayDate ?? formatDateParam(new Date())) + "T00:00:00");
      end = addDays(start, 1);
    } else if (view === "month") {
      const ms = monthStart ?? formatMonthParam(new Date());
      const [y, m] = ms.split("-").map(Number);
      const firstOfMonth = new Date(y, m - 1, 1);
      const dayOfWeek = firstOfMonth.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(y, m - 1, 1 + diff);
      end = addDays(start, 42);
    } else {
      start = new Date(weekStart + "T00:00:00");
      end = addDays(start, 7);
    }

    const [appts, blocked] = await Promise.all([
      getAppointmentsForRange(start, end),
      getBlockedTimesForRange(start, end),
    ]);
    setAppointments(appts);
    setBlockedTimes(blocked);
  }, [view, weekStart, dayDate, monthStart]);

  // Build days for weekly view
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  // "Is current period" for time indicator
  const isCurrentPeriod = (() => {
    if (view === "day") return dayDate ? isDateToday(currentDayDate) : true;
    if (view === "week") {
      const todayMonday = getMondayOf(new Date());
      return formatDateParam(monday) === formatDateParam(todayMonday);
    }
    return false; // month has no time indicator
  })();

  // Compute "show today button" flag
  const showTodayButton = (() => {
    if (view === "day") {
      return !isDateToday(currentDayDate);
    }
    if (view === "week") {
      const todayMonday = getMondayOf(new Date());
      return formatDateParam(monday) !== formatDateParam(todayMonday);
    }
    if (view === "month") {
      const now = new Date();
      return now.getFullYear() !== currentMonthYear || now.getMonth() + 1 !== currentMonthNum;
    }
    return false;
  })();

  // Header label
  const headerLabel = (() => {
    if (view === "day") {
      return currentDayDate.toLocaleDateString("en-CA", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (view === "month") {
      return new Date(currentMonthYear, currentMonthNum - 1, 1).toLocaleDateString("en-CA", {
        month: "long",
        year: "numeric",
      });
    }
    // Week
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return start.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
    }
    return `${start.toLocaleDateString("en-CA", { month: "short" })} \u2013 ${end.toLocaleDateString("en-CA", { month: "short", year: "numeric" })}`;
  })();

  // Navigation aria labels
  const periodName = view === "day" ? "day" : view === "week" ? "week" : "month";

  // Slot click handlers
  function handleWeekSlotClick(dayIndex: number, slotIndex: number) {
    const day = weekDays[dayIndex];
    const hour = calStartHour + Math.floor(slotIndex / 2);
    const minute = slotIndex % 2 === 0 ? 0 : 30;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dt = `${formatDateParam(day)}T${pad(hour)}:${pad(minute)}`;
    setModal({ type: "book", defaultScheduledAt: dt });
  }

  function handleDaySlotClick(_dayIndex: number, slotIndex: number, providerId?: string) {
    const hour = calStartHour + Math.floor(slotIndex / 2);
    const minute = slotIndex % 2 === 0 ? 0 : 30;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dt = `${formatDateParam(currentDayDate)}T${pad(hour)}:${pad(minute)}`;
    setModal({ type: "book", defaultScheduledAt: dt, defaultProviderId: providerId ?? null });
  }

  function handleCardClick(appointment: CalendarAppointment, e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setModal({ type: "actions", appointment, anchorRect: rect });
  }

  function handleMonthDayClick(dateStr: string) {
    router.push(`/appointments?view=day&date=${dateStr}`);
  }

  const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigatePeriod(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={`Previous ${periodName}`}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => navigatePeriod(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={`Next ${periodName}`}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 ml-1">{headerLabel}</h2>
          {showTodayButton && (
            <button
              type="button"
              onClick={goToday}
              className="ml-2 px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => switchView(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Provider filter */}
          {providers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedProviderId ?? ""}
                onChange={(e) => setSelectedProviderId(e.target.value || null)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Providers</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setModal({ type: "book" })}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* View content */}
      {view === "week" && (
        <WeeklyView
          days={weekDays}
          filteredAppointments={filteredAppointments}
          blockedTimes={blockedTimes}
          selectedProviderId={selectedProviderId}
          calStartHour={calStartHour}
          calEndHour={calEndHour}
          isCurrentPeriod={isCurrentPeriod}
          currentTime={currentTime}
          onSlotClick={handleWeekSlotClick}
          onCardClick={handleCardClick}
        />
      )}

      {view === "day" && (
        <DailyView
          day={currentDayDate}
          filteredAppointments={filteredAppointments}
          blockedTimes={blockedTimes}
          selectedProviderId={selectedProviderId}
          providers={providers}
          calStartHour={calStartHour}
          calEndHour={calEndHour}
          isCurrentPeriod={isCurrentPeriod}
          currentTime={currentTime}
          onSlotClick={handleDaySlotClick}
          onCardClick={handleCardClick}
        />
      )}

      {view === "month" && (
        <MonthlyView
          year={currentMonthYear}
          month={currentMonthNum - 1}
          appointments={appointments}
          blockedTimes={blockedTimes}
          selectedProviderId={selectedProviderId}
          onDayClick={handleMonthDayClick}
        />
      )}

      {/* Modals */}
      {modal.type === "book" && (
        <BookAppointmentModal
          defaultScheduledAt={modal.defaultScheduledAt}
          defaultType={modal.defaultType}
          defaultProviderId={modal.defaultProviderId}
          serviceTypes={serviceTypes}
          providers={providers}
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
