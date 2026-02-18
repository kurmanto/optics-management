import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { NotificationPreferencesForm } from "@/components/settings/NotificationPreferencesForm";
import { FontSizeForm } from "@/components/settings/FontSizeForm";
import { NotificationType } from "@prisma/client";

export default async function SettingsPage() {
  const session = await verifySession();

  const [settings, notifPrefs] = await Promise.all([
    prisma.systemSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.notificationPreference.findMany({ where: { userId: session.id } }),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  // Build a map of type → enabled (default true if no record exists)
  const prefMap = Object.fromEntries(
    notifPrefs.map((p) => [p.type, p.enabled])
  ) as Partial<Record<NotificationType, boolean>>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Account */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Account</h2>
        <div className="text-sm space-y-1">
          <p className="text-gray-700 font-medium">{session.name}</p>
          <p className="text-gray-500">{session.email}</p>
          <p className="text-xs text-gray-400 capitalize">Role: {session.role.toLowerCase()}</p>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Change Password</h2>
        <ChangePasswordForm />
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">System Settings</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <dt className="text-gray-500">Business Name</dt>
            <dd className="font-medium">{settingsMap.business_name || "—"}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <dt className="text-gray-500">Tax Rate</dt>
            <dd className="font-medium">{settingsMap.tax_rate ? `${(parseFloat(settingsMap.tax_rate) * 100).toFixed(0)}%` : "—"}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Invoice Notes</dt>
            <dd className="font-medium text-right max-w-xs">{settingsMap.invoice_notes || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Display Preferences */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-1">Display Preferences</h2>
        <p className="text-sm text-gray-500 mb-4">
          Choose the text size that&apos;s most comfortable for you.
        </p>
        <FontSizeForm initialSize={session.fontSizePreference} />
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose which events show up in your notification bell. You will not see notifications for actions you take yourself.
          </p>
        </div>
        <NotificationPreferencesForm initialPreferences={prefMap} />
      </div>
    </div>
  );
}
