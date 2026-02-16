import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export default async function SettingsPage() {
  const session = await verifySession();

  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: "asc" },
  });

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

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
    </div>
  );
}
