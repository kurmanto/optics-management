"use client";

import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_BG_HEX,
  APPOINTMENT_TYPE_BORDER_HEX,
  type CalendarAppointment,
} from "@/lib/types/appointment";
import { cn } from "@/lib/utils/cn";

type Props = {
  appointment: CalendarAppointment;
  style?: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
};

export function AppointmentCard({ appointment, style, onClick }: Props) {
  const isMuted = appointment.status === "CANCELLED" || appointment.status === "NO_SHOW";

  const bgColor = APPOINTMENT_TYPE_BG_HEX[appointment.type] ?? "#F9FAFB";
  const borderColor = APPOINTMENT_TYPE_BORDER_HEX[appointment.type] ?? "#6B7280";

  const start = new Date(appointment.scheduledAt);
  const end = new Date(start.getTime() + appointment.duration * 60 * 1000);

  const timeLabel = `${start.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false })}–${end.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ borderLeftColor: borderColor, backgroundColor: bgColor, ...style }}
      className={cn(
        "absolute w-full text-left rounded-r-md border-l-4 px-1.5 py-1 overflow-hidden cursor-pointer transition-opacity hover:opacity-80",
        isMuted && "opacity-40"
      )}
    >
      <p className="text-xs font-semibold text-gray-900 leading-tight truncate">
        {appointment.customerName}
      </p>
      <p className="text-[10px] text-gray-600 leading-tight truncate">
        {timeLabel}
      </p>
      {appointment.duration >= 45 && (
        <p className="text-[10px] text-gray-500 leading-tight truncate">
          {APPOINTMENT_TYPE_LABELS[appointment.type] ?? appointment.type}
        </p>
      )}
    </button>
  );
}
