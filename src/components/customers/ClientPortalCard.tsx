"use client";

import { useState } from "react";
import { Shield, Send, Ban, Loader2, ExternalLink } from "lucide-react";
import { createClientPortalAccount, disableClientPortalAccount, sendPortalInviteEmail } from "@/lib/actions/client-portal-admin";
import { formatDate } from "@/lib/utils/formatters";

interface ClientPortalCardProps {
  customerId: string;
  customerEmail: string | null;
  familyId: string | null;
  familyName: string | null;
  portalAccount: {
    id: string;
    email: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  } | null;
}

export function ClientPortalCard({
  customerId,
  customerEmail,
  familyId,
  familyName,
  portalAccount,
}: ClientPortalCardProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [email, setEmail] = useState(customerEmail ?? "");
  const [account, setAccount] = useState(portalAccount);

  async function handleCreate() {
    if (!familyId) return;
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("familyId", familyId);
    formData.set("primaryCustomerId", customerId);
    formData.set("email", email);

    const result = await createClientPortalAccount(formData);
    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Portal account created! Send an invite to let them log in." });
      setAccount({
        id: "pending-refresh",
        email,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
      });
    }
  }

  async function handleSendInvite() {
    if (!account) return;
    setLoading(true);
    setMessage(null);

    const result = await sendPortalInviteEmail(account.id);
    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Invite email sent." });
    }
  }

  async function handleDisable() {
    if (!account) return;
    setLoading(true);
    setMessage(null);

    const result = await disableClientPortalAccount(account.id);
    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Portal account disabled." });
      setAccount({ ...account, isActive: false });
    }
  }

  // No family — can't create portal
  if (!familyId) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Client Portal</h2>
        </div>
        <p className="text-sm text-gray-500">
          Create a family first to enable the client portal.
        </p>
      </div>
    );
  }

  // Account exists
  if (account) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-gray-900 text-sm">Client Portal</h2>
          <span
            className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
              account.isActive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {account.isActive ? "Active" : "Disabled"}
          </span>
        </div>

        <dl className="space-y-2 text-sm mb-3">
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900 font-medium">{account.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-900">{formatDate(account.createdAt)}</dd>
          </div>
          {account.lastLoginAt && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Last login</dt>
              <dd className="text-gray-900">{formatDate(account.lastLoginAt)}</dd>
            </div>
          )}
          {!account.lastLoginAt && account.isActive && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Last login</dt>
              <dd className="text-amber-600 text-xs font-medium">Never logged in</dd>
            </div>
          )}
        </dl>

        {message && (
          <div
            className={`text-xs px-3 py-2 rounded-lg mb-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {account.isActive && (
          <div className="flex gap-2">
            <button
              onClick={handleSendInvite}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Invite
            </button>
            <button
              onClick={handleDisable}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50 ml-auto"
            >
              <Ban className="w-3.5 h-3.5" />
              Disable
            </button>
          </div>
        )}
      </div>
    );
  }

  // No account — show create form
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold text-gray-900 text-sm">Client Portal</h2>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Enable the family portal for the {familyName} family. The primary contact will receive a login link via email.
      </p>

      <div className="space-y-2">
        <label className="block text-xs text-gray-600 font-medium">
          Portal login email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="family@example.com"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {message && (
        <div
          className={`text-xs px-3 py-2 rounded-lg mt-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading || !email.trim()}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
        Enable Portal
      </button>
    </div>
  );
}
