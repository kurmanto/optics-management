import { verifySession } from "@/lib/dal";
import { getAppointmentsForRange, getProvidersForBooking, getBlockedTimesForRange } from "@/lib/actions/appointments";
import { getServiceTypes } from "@/lib/actions/appointment-settings";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { CalendarDays } from "lucide-react";
import type { CalendarViewType } from "@/lib/types/appointment";

type SearchParams = {
  week?: string;
  view?: string;
  date?: string;
  month?: string;
};

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await verifySession();

  const params = await searchParams;

  // Determine view type
  const viewParam = params.view;
  let initialView: CalendarViewType = "week";
  if (viewParam === "day") initialView = "day";
  else if (viewParam === "month") initialView = "month";

  // Compute date ranges based on view
  let rangeStart: Date;
  let rangeEnd: Date;
  let weekStartStr: string;
  let dayDateStr: string | undefined;
  let monthStartStr: string | undefined;

  if (initialView === "day") {
    // Day view
    let dayDate: Date;
    if (params.date) {
      const parsed = new Date(params.date + "T00:00:00");
      dayDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      dayDate = new Date();
    }
    dayDate.setHours(0, 0, 0, 0);
    rangeStart = dayDate;
    rangeEnd = addDays(dayDate, 1);
    dayDateStr = formatDate(dayDate);
    // Still need weekStart for context switching
    weekStartStr = formatDate(getMondayOf(dayDate));
  } else if (initialView === "month") {
    // Month view
    let year: number;
    let month: number;
    if (params.month) {
      const parts = params.month.split("-").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        year = parts[0];
        month = parts[1] - 1; // 0-indexed
      } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth();
      }
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }

    const firstOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstOfMonth.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    rangeStart = new Date(year, month, 1 + diff);
    rangeEnd = addDays(rangeStart, 42);
    monthStartStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    weekStartStr = formatDate(getMondayOf(new Date()));
  } else {
    // Week view (default, backwards compatible)
    let monday: Date;
    if (params.week) {
      const parsed = new Date(params.week + "T00:00:00");
      monday = isNaN(parsed.getTime()) ? getMondayOf(new Date()) : getMondayOf(parsed);
    } else {
      monday = getMondayOf(new Date());
    }
    rangeStart = monday;
    rangeEnd = addDays(monday, 7);
    weekStartStr = formatDate(monday);
  }

  const [appointments, serviceTypes, providers, blockedTimes] = await Promise.all([
    getAppointmentsForRange(rangeStart, rangeEnd),
    getServiceTypes(),
    getProvidersForBooking(),
    getBlockedTimesForRange(rangeStart, rangeEnd),
  ]);

  // Subtitle
  const subtitle = (() => {
    if (initialView === "day" && dayDateStr) {
      const d = new Date(dayDateStr + "T00:00:00");
      return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    if (initialView === "month" && monthStartStr) {
      const [y, m] = monthStartStr.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
    }
    // Week
    const monday = new Date(weekStartStr + "T00:00:00");
    return `Week of ${monday.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}`;
  })();

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <CalendarDays className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AppointmentCalendar
          initialAppointments={appointments}
          weekStart={weekStartStr}
          serviceTypes={serviceTypes}
          providers={providers}
          blockedTimes={blockedTimes}
          initialView={initialView}
          dayDate={dayDateStr}
          monthStart={monthStartStr}
        />
      </div>
    </div>
  );
}
