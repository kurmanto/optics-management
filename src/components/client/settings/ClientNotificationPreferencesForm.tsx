"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  getClientNotificationPreferences,
  updateClientNotificationPreference,
} from "@/lib/actions/client-notifications";

type NotifType = {
  type: string;
  label: string;
  description: string;
};

const NOTIFICATION_TYPES: NotifType[] = [
  { type: "EXAM_DUE_SOON", label: "Exam Reminders", description: "When an eye exam is due or overdue" },
  { type: "APPOINTMENT_REMINDER", label: "Appointment Reminders", description: "24h before an upcoming appointment" },
  { type: "ORDER_STATUS_UPDATE", label: "Order Updates", description: "When your order status changes" },
  { type: "BENEFIT_ELIGIBLE", label: "Insurance Benefits", description: "When insurance benefits become eligible" },
  { type: "UNLOCK_CARD_EARNED", label: "Unlock Cards", description: "When you earn a new unlock card" },
  { type: "TIER_UPGRADED", label: "Tier Upgrades", description: "When your loyalty tier changes" },
  { type: "POINTS_EARNED", label: "Points Earned", description: "When you earn vision points" },
];

type PrefMap = Record<string, { inApp: boolean; email: boolean }>;

export function ClientNotificationPreferencesForm() {
  const [prefs, setPrefs] = useState<PrefMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getClientNotificationPreferences().then((data) => {
      const map: PrefMap = {};
      for (const p of data) {
        map[p.type] = { inApp: p.inAppEnabled, email: p.emailEnabled };
      }
      setPrefs(map);
      setLoading(false);
    });
  }, []);

  async function toggle(type: string, field: "inApp" | "email") {
    const current = prefs[type] || { inApp: true, email: true };
    const updated = { ...current, [field]: !current[field] };

    setPrefs((prev) => ({ ...prev, [type]: updated }));
    setSaving(type);

    await updateClientNotificationPreference(
      type as any,
      updated.inApp,
      updated.email
    );

    setSaving(null);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Notification Preferences</h3>
      </div>

      <div className="space-y-3">
        {NOTIFICATION_TYPES.map((nt) => {
          const pref = prefs[nt.type] || { inApp: true, email: true };
          const isSaving = saving === nt.type;

          return (
            <div key={nt.type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium text-gray-900">{nt.label}</p>
                <p className="text-xs text-gray-500">{nt.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pref.inApp}
                    onChange={() => toggle(nt.type, "inApp")}
                    disabled={isSaving}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-gray-500">In-app</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pref.email}
                    onChange={() => toggle(nt.type, "email")}
                    disabled={isSaving}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-gray-500">Email</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
