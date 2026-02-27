"use client";

import { useState } from "react";
import { cancelAppointment } from "@/lib/actions/client-booking";
import { formatDate } from "@/lib/utils/formatters";
import { Calendar, X } from "lucide-react";

interface Appointment {
  id: string;
  type: string;
  scheduledAt: Date;
  status: string;
  customer: { firstName: string };
}

interface UpcomingAppointmentsListProps {
  appointments: Appointment[];
}

const TYPE_LABELS: Record<string, string> = {
  EYE_EXAM: "Eye Exam",
  CONTACT_LENS_FITTING: "Contact Lens Fitting",
  FOLLOW_UP: "Follow-up",
  GLASSES_PICKUP: "Glasses Pickup",
  ADJUSTMENT: "Adjustment",
  STYLING: "Styling",
};

export function UpcomingAppointmentsList({ appointments: initialAppointments }: UpcomingAppointmentsListProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function handleCancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    setCancelling(id);
    const result = await cancelAppointment(id);
    if (!result.error) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    }
    setCancelling(null);
  }

  if (appointments.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Upcoming Appointments</h3>
      </div>
      <div className="space-y-2">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {apt.customer.firstName} · {TYPE_LABELS[apt.type] || apt.type}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(apt.scheduledAt)} at{" "}
                {new Date(apt.scheduledAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {["SCHEDULED", "CONFIRMED"].includes(apt.status) && (
              <button
                type="button"
                onClick={() => handleCancel(apt.id)}
                disabled={cancelling === apt.id}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
