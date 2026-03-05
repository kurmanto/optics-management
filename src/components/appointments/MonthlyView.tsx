"use client";

import { type CalendarAppointment } from "@/lib/types/appointment";

type BlockedTimeEntry = {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  providerId: string | null;
};

type MonthlyViewProps = {
  year: number;
  month: number; // 0-indexed
  appointments: CalendarAppointment[];
  blockedTimes: BlockedTimeEntry[];
  selectedProviderId: string | null;
  onDayClick: (dateStr: string) => void;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Generate 42 calendar cells (6 rows x 7 cols, Monday-start)
 * for the given month.
 */
function generateCalendarDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  // Get Monday before or on the 1st
  const dayOfWeek = firstOfMonth.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const gridStart = new Date(year, month, 1 + diff);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export function MonthlyView({
  year,
  month,
  appointments,
  blockedTimes,
  selectedProviderId,
  onDayClick,
}: MonthlyViewProps) {
  const calendarDays = generateCalendarDays(year, month);

  // Filter appointments by provider
  const filteredAppointments = selectedProviderId
    ? appointments.filter((a) => a.providerId === selectedProviderId)
    : appointments;

  // Index appointments by date string for fast lookup
  const appointmentsByDate = new Map<string, CalendarAppointment[]>();
  for (const a of filteredAppointments) {
    const d = new Date(a.scheduledAt);
    const key = formatDateStr(d);
    const existing = appointmentsByDate.get(key) ?? [];
    existing.push(a);
    appointmentsByDate.set(key, existing);
  }

  // Check if a day is fully blocked (entire business hours)
  function isDayFullyBlocked(day: Date): boolean {
    const dayStart = new Date(day);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(19, 0, 0, 0);

    const relevant = blockedTimes.filter((bt) => {
      const btStart = new Date(bt.startAt);
      const btEnd = new Date(bt.endAt);
      if (btStart >= dayEnd || btEnd <= dayStart) return false;
      if (bt.providerId && selectedProviderId && bt.providerId !== selectedProviderId) return false;
      return true;
    });

    return relevant.some((bt) => {
      const btStart = new Date(bt.startAt);
      const btEnd = new Date(bt.endAt);
      return btStart <= dayStart && btEnd >= dayEnd;
    });
  }

  const MAX_VISIBLE = 3;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center py-2 text-xs font-medium text-gray-500 border-l border-gray-200 first:border-l-0"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dateStr = formatDateStr(day);
            const isCurrentMonth = day.getMonth() === month;
            const todayCell = isToday(day);
            const dayAppts = appointmentsByDate.get(dateStr) ?? [];
            const fullyBlocked = isDayFullyBlocked(day);
            const overflow = dayAppts.length - MAX_VISIBLE;

            return (
              <div
                key={i}
                className={`min-h-[100px] p-1.5 border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !isCurrentMonth
                    ? "bg-gray-50/50"
                    : todayCell
                      ? "bg-primary/5"
                      : ""
                }`}
                style={
                  fullyBlocked
                    ? {
                        background:
                          "repeating-linear-gradient(45deg, rgba(156,163,175,0.08), rgba(156,163,175,0.08) 4px, transparent 4px, transparent 8px)",
                      }
                    : undefined
                }
                onClick={() => onDayClick(dateStr)}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`text-xs font-semibold ${
                      !isCurrentMonth
                        ? "text-gray-300"
                        : todayCell
                          ? "text-primary"
                          : "text-gray-700"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayAppts.length > 0 && (
                    <span className="text-[10px] font-semibold bg-gray-200 text-gray-600 rounded-full px-1.5 leading-tight">
                      {dayAppts.length}
                    </span>
                  )}
                </div>

                {/* Appointment summaries */}
                <div className="space-y-px">
                  {dayAppts.slice(0, MAX_VISIBLE).map((appt) => {
                    const start = new Date(appt.scheduledAt);
                    const timeStr = start.toLocaleTimeString("en-CA", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                    const lastName = appt.customerName.split(" ").pop() ?? "";
                    return (
                      <div
                        key={appt.id}
                        className="text-[11px] text-gray-600 truncate leading-tight"
                        style={{
                          borderLeft: `2px solid ${appt.serviceTypeColor ?? "#6B7280"}`,
                          paddingLeft: "4px",
                        }}
                      >
                        {timeStr} {lastName}
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-[10px] text-gray-400 font-medium pl-1.5">
                      +{overflow} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
