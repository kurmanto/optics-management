"use client";

import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { updateNotificationPreference } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils/cn";

type NotificationType =
  | "FORM_COMPLETED"
  | "INTAKE_COMPLETED"
  | "ORDER_READY"
  | "ORDER_CANCELLED"
  | "ORDER_LAB_RECEIVED"
  | "PO_RECEIVED"
  | "LOW_STOCK";

type PreferenceMap = Partial<Record<NotificationType, boolean>>;

type NotificationTypeConfig = {
  type: NotificationType;
  label: string;
  description: string;
};

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    type: "FORM_COMPLETED",
    label: "Form Submitted",
    description: "A patient submits a digital form.",
  },
  {
    type: "INTAKE_COMPLETED",
    label: "Intake Package Completed",
    description: "A patient completes all 3 intake forms.",
  },
  {
    type: "ORDER_READY",
    label: "Order Ready for Pickup",
    description: "An order is advanced to Ready status.",
  },
  {
    type: "ORDER_CANCELLED",
    label: "Order Cancelled",
    description: "An order is cancelled by another staff member.",
  },
  {
    type: "ORDER_LAB_RECEIVED",
    label: "Lab Order Received",
    description: "An order arrives back from the lab.",
  },
  {
    type: "PO_RECEIVED",
    label: "Purchase Order Received",
    description: "Inventory is received against a purchase order.",
  },
  {
    type: "LOW_STOCK",
    label: "Low Stock Alert",
    description: "A product falls to or below its reorder point.",
  },
];

type Props = {
  initialPreferences: PreferenceMap;
};

export function NotificationPreferencesForm({ initialPreferences }: Props) {
  const [prefs, setPrefs] = useState<PreferenceMap>(initialPreferences);
  const [savingType, setSavingType] = useState<NotificationType | null>(null);
  const [errors, setErrors] = useState<Partial<Record<NotificationType, string>>>({});

  async function handleToggle(type: NotificationType, enabled: boolean) {
    const previous = prefs[type] ?? true;
    // Optimistic update
    setPrefs((p) => ({ ...p, [type]: enabled }));
    setSavingType(type);

    const result = await updateNotificationPreference(type, enabled);

    setSavingType(null);
    if (result.error) {
      // Revert on error
      setPrefs((p) => ({ ...p, [type]: previous }));
      setErrors((e) => ({ ...e, [type]: result.error }));
    } else {
      setErrors((e) => ({ ...e, [type]: undefined }));
    }
  }

  return (
    <div className="space-y-4">
      {NOTIFICATION_TYPES.map(({ type, label, description }) => {
        const enabled = prefs[type] ?? true;
        const isSaving = savingType === type;

        return (
          <div
            key={type}
            className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              {errors[type] && (
                <p className="text-xs text-red-500 mt-1">{errors[type]}</p>
              )}
            </div>
            <Switch.Root
              checked={enabled}
              onCheckedChange={(v) => handleToggle(type, v)}
              disabled={isSaving}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                enabled ? "bg-primary" : "bg-gray-200",
                isSaving && "opacity-50 cursor-not-allowed"
              )}
            >
              <Switch.Thumb
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                  enabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </Switch.Root>
          </div>
        );
      })}
    </div>
  );
}
