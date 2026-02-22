"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { updateAppointmentStatus, rescheduleAppointment } from "@/lib/actions/appointments";
import {
  APPOINTMENT_TYPE_LABELS,
  APPT_STATUS_COLORS,
  APPT_STATUS_LABELS,
  type CalendarAppointment,
} from "@/lib/types/appointment";
import { cn } from "@/lib/utils/cn";

type Props = {
  appointment: CalendarAppointment;
  anchorRect: DOMRect;
  onClose: () => void;
  onRefresh: () => void;
};

export function AppointmentActions({ appointment, anchorRect, onClose, onRefresh }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleStatus(status: string) {
    setPending(status);
    setError("");
    const result = await updateAppointmentStatus(appointment.id, status as any);
    setPending(null);
    if ("error" in result) {
      setError(result.error);
    } else {
      onRefresh();
      onClose();
    }
  }

  async function handleReschedule() {
    if (!rescheduleAt) { setError("Date and time are required"); return; }
    setPending("RESCHEDULE");
    setError("");
    const result = await rescheduleAppointment({ id: appointment.id, scheduledAt: rescheduleAt });
    setPending(null);
    if ("error" in result) {
      setError(result.error);
    } else {
      onRefresh();
      onClose();
    }
  }

  const start = new Date(appointment.scheduledAt);
  const end = new Date(start.getTime() + appointment.duration * 60 * 1000);
  const timeLabel = `${start.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false })}–${end.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  const dateLabel = start.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });

  // Status-based action buttons
  const status = appointment.status;
  const isClosed = status === "CANCELLED" || status === "NO_SHOW" || status === "COMPLETED";

  // Position popover: prefer right of anchor, fall back left
  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    top: Math.min(anchorRect.top, window.innerHeight - 340),
    left: anchorRect.right + 8,
    zIndex: 60,
    width: 280,
  };
  // If too close to right edge, flip left
  if (anchorRect.right + 8 + 280 > window.innerWidth) {
    popoverStyle.left = anchorRect.left - 280 - 8;
  }

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href={`/customers/${appointment.customerId}`}
              className="text-sm font-bold text-gray-900 hover:underline flex items-center gap-1 truncate"
            >
              {appointment.customerName}
              <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-400" />
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">
              {dateLabel} · {timeLabel} · {appointment.duration} min
            </p>
            <p className="text-xs text-gray-500">
              {APPOINTMENT_TYPE_LABELS[appointment.type] ?? appointment.type}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status badge */}
        <div>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", APPT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600")}>
            {APPT_STATUS_LABELS[status] ?? status}
          </span>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{error}</p>
        )}

        {/* Action buttons */}
        {!isClosed && (
          <div className="space-y-1.5">
            {status === "SCHEDULED" && (
              <>
                <ActionBtn label="Confirm" onClick={() => handleStatus("CONFIRMED")} pending={pending === "CONFIRMED"} color="green" />
                <ActionBtn label="Check In" onClick={() => handleStatus("CHECKED_IN")} pending={pending === "CHECKED_IN"} color="blue" />
              </>
            )}
            {status === "CONFIRMED" && (
              <ActionBtn label="Check In" onClick={() => handleStatus("CHECKED_IN")} pending={pending === "CHECKED_IN"} color="blue" />
            )}
            {status === "CHECKED_IN" && (
              <ActionBtn label="Complete" onClick={() => handleStatus("COMPLETED")} pending={pending === "COMPLETED"} color="green" />
            )}
            {(status === "SCHEDULED" || status === "CONFIRMED") && (
              <>
                <ActionBtn label="No Show" onClick={() => handleStatus("NO_SHOW")} pending={pending === "NO_SHOW"} color="orange" />
                <ActionBtn label="Cancel" onClick={() => handleStatus("CANCELLED")} pending={pending === "CANCELLED"} color="red" />
              </>
            )}
          </div>
        )}

        {/* Reschedule (for closed/cancelled) */}
        {isClosed && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Reschedule</p>
            <input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleReschedule}
              disabled={pending === "RESCHEDULE"}
              className="w-full bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {pending === "RESCHEDULE" ? "Rescheduling..." : "Reschedule"}
            </button>
          </div>
        )}

        {/* Notes */}
        {appointment.notes && (
          <div className="border-t border-gray-100 pt-2">
            <p className="text-xs text-gray-500 italic">{appointment.notes}</p>
          </div>
        )}
      </div>
    </>
  );
}

function ActionBtn({
  label,
  onClick,
  pending,
  color,
}: {
  label: string;
  onClick: () => void;
  pending: boolean;
  color: "green" | "blue" | "orange" | "red";
}) {
  const colorMap = {
    green: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    orange: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200",
    red: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50",
        colorMap[color]
      )}
    >
      {pending ? "..." : label}
    </button>
  );
}
