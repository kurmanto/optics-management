import { verifyClientSession } from "@/lib/client-dal";
import { prisma } from "@/lib/prisma";
import { SetPasswordForm } from "@/components/client/auth/SetPasswordForm";
import { LogoutButton } from "./LogoutButton";
import { Settings, Mail, Shield } from "lucide-react";

export default async function SettingsPage() {
  const session = await verifyClientSession();

  const account = await prisma.clientAccount.findUnique({
    where: { id: session.clientAccountId },
    select: {
      email: true,
      phone: true,
      passwordHash: true,
      lastLoginAt: true,
      primaryCustomer: { select: { firstName: true, lastName: true } },
    },
  });

  if (!account) return null;

  const hasPassword = !!account.passwordHash;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">
            {account.primaryCustomer.firstName} {account.primaryCustomer.lastName}
          </p>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Account</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4 text-gray-400" />
          <span>{account.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Shield className="h-4 w-4 text-gray-400" />
          <span>{hasPassword ? "Password login enabled" : "Magic link only"}</span>
        </div>
        {account.lastLoginAt && (
          <p className="text-xs text-gray-400">
            Last login: {new Date(account.lastLoginAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Password management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {hasPassword ? "Change Password" : "Set a Password"}
        </h3>
        <SetPasswordForm />
      </div>

      {/* Logout */}
      <div className="pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}
