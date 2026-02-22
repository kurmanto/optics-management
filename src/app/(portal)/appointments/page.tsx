import { verifySession } from "@/lib/dal";
import { getAppointmentsForRange } from "@/lib/actions/appointments";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { CalendarDays } from "lucide-react";

type SearchParams = {
  week?: string;
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

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await verifySession();

  const params = await searchParams;

  // Resolve week start (Monday)
  let monday: Date;
  if (params.week) {
    const parsed = new Date(params.week + "T00:00:00");
    monday = isNaN(parsed.getTime()) ? getMondayOf(new Date()) : getMondayOf(parsed);
  } else {
    monday = getMondayOf(new Date());
  }

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 7);

  const appointments = await getAppointmentsForRange(monday, sunday);

  const weekStartStr = formatDate(monday);

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <CalendarDays className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Week of {monday.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AppointmentCalendar
          initialAppointments={appointments}
          weekStart={weekStartStr}
        />
      </div>
    </div>
  );
}
