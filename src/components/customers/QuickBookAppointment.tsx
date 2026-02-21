"use client";

import { useState, useTransition } from "react";
import { Calendar, Clock, Plus, X } from "lucide-react";
import { createAppointment, cancelAppointment } from "@/lib/actions/appointments";
import { formatDate } from "@/lib/utils/formatters";

type Appointment = {
  id: string;
  type: string;
  status: string;
  scheduledAt: Date;
  duration: number;
  notes: string | null;
};

type Props = {
  customerId: string;
  initialAppointments: Appointment[];
};

const APPOINTMENT_TYPES = [
  { value: "EYE_EXAM", label: "Eye Exam" },
  { value: "CONTACT_LENS_FITTING", label: "Contact Lens Fitting" },
  { value: "FOLLOW_UP", label: "Follow-Up" },
  { value: "GLASSES_PICKUP", label: "Glasses Pickup" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "STYLING", label: "Eyewear Styling" },
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CHECKED_IN: "bg-primary/10 text-primary",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

export function QuickBookAppointment({ customerId, initialAppointments }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [apptType, setApptType] = useState("STYLING");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  const upcomingAppts = initialAppointments.filter(
    (a) => a.status !== "CANCELLED" && new Date(a.scheduledAt) >= new Date()
  );

  function handleBook() {
    if (!scheduledAt) { setError("Date and time are required"); return; }
    setError("");
    startTransition(async () => {
      const result = await createAppointment({
        customerId,
        type: apptType,
        scheduledAt,
        duration,
        notes: notes || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setShowForm(false);
        setScheduledAt(""); setNotes(""); setApptType("STYLING"); setDuration(30);
      }
    });
  }

  function handleCancel(id: string) {
    startTransition(async () => { await cancelAppointment(id); });
  }

  return (
    <div className="space-y-4">
      {/* Upcoming appointments list */}
      {upcomingAppts.length > 0 ? (
        <div className="space-y-2">
          {upcomingAppts.map((appt) => (
            <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {APPOINTMENT_TYPES.find(t => t.value === appt.type)?.label || appt.type}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(appt.scheduledAt).toLocaleDateString("en-CA", {
                    weekday: "short", month: "short", day: "numeric",
                  })} at {new Date(appt.scheduledAt).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}{appt.duration} min
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[appt.status] || "bg-gray-100 text-gray-600"}`}>
                  {appt.status.replace(/_/g, " ")}
                </span>
                <button
                  onClick={() => handleCancel(appt.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="Cancel appointment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && <p className="text-sm text-gray-400 text-center py-2">No upcoming appointments.</p>
      )}

      {/* Booking form */}
      {showForm ? (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Book Appointment</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={apptType}
                onChange={(e) => setApptType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration (min)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {[15, 30, 45, 60, 90].map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requirements..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
            <button onClick={handleBook} disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {pending ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      )}
    </div>
  );
}
