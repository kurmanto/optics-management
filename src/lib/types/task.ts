export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export const TASK_CATEGORIES = ["CLINICAL", "ADMIN", "LAB", "MARKETING"] as const;
export const TASK_PRIORITIES = ["NORMAL", "URGENT"] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const TASK_CATEGORY_LABELS: Record<string, string> = {
  CLINICAL: "Clinical",
  ADMIN: "Admin",
  LAB: "Lab",
  MARKETING: "Marketing",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export const TASK_CATEGORY_COLORS: Record<string, string> = {
  CLINICAL: "bg-rose-100 text-rose-700",
  ADMIN: "bg-slate-100 text-slate-700",
  LAB: "bg-purple-100 text-purple-700",
  MARKETING: "bg-cyan-100 text-cyan-700",
};

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  NORMAL: "bg-gray-100 text-gray-600",
  URGENT: "bg-red-100 text-red-700",
};
