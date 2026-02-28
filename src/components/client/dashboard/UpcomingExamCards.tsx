import { Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";

interface Appointment {
  id: string;
  type: string;
  scheduledAt: Date;
  customer: { firstName: string };
}

interface UpcomingExamCardsProps {
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

export function UpcomingExamCards({ appointments }: UpcomingExamCardsProps) {
  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Upcoming Appointments</h3>
        </div>
        <p className="text-sm text-gray-500">No upcoming appointments.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Upcoming</h3>
      </div>
      <div className="space-y-2">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{apt.customer.firstName}</p>
              <p className="text-xs text-gray-500">{TYPE_LABELS[apt.type] || apt.type}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {formatDate(apt.scheduledAt)}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(apt.scheduledAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
