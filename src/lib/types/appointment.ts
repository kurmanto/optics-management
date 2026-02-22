export type CalendarAppointment = {
  id: string;
  type: string;
  status: string;
  scheduledAt: string; // ISO string
  duration: number;
  notes: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
};

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  EYE_EXAM: "Eye Exam",
  CONTACT_LENS_FITTING: "Contact Lens Fitting",
  FOLLOW_UP: "Follow-Up",
  GLASSES_PICKUP: "Glasses Pickup",
  ADJUSTMENT: "Adjustment",
  STYLING: "Eyewear Styling",
};

// Hex colors for card backgrounds — inline style to avoid Tailwind purge issues
export const APPOINTMENT_TYPE_BG_HEX: Record<string, string> = {
  EYE_EXAM: "#EFF6FF",         // blue-50
  CONTACT_LENS_FITTING: "#FAF5FF", // purple-50
  FOLLOW_UP: "#FFF7ED",        // orange-50
  GLASSES_PICKUP: "#F0FDF4",   // green-50
  ADJUSTMENT: "#FEFCE8",       // yellow-50
  STYLING: "#ECFDF5",          // emerald-50
};

// Hex colors for left border
export const APPOINTMENT_TYPE_BORDER_HEX: Record<string, string> = {
  EYE_EXAM: "#3B82F6",
  CONTACT_LENS_FITTING: "#A855F7",
  FOLLOW_UP: "#F97316",
  GLASSES_PICKUP: "#22C55E",
  ADJUSTMENT: "#EAB308",
  STYLING: "#10B981",
};

export const APPT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CHECKED_IN: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

export const APPT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const APPOINTMENT_TYPES = [
  { value: "EYE_EXAM", label: "Eye Exam" },
  { value: "CONTACT_LENS_FITTING", label: "Contact Lens Fitting" },
  { value: "FOLLOW_UP", label: "Follow-Up" },
  { value: "GLASSES_PICKUP", label: "Glasses Pickup" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "STYLING", label: "Eyewear Styling" },
];

// Calendar layout constants
export const CALENDAR_START_HOUR = 9;   // 9 AM
export const CALENDAR_END_HOUR = 19;    // 7 PM
export const SLOT_HEIGHT_PX = 44;       // px per 30-min slot
