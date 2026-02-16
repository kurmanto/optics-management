"use client";

import { useState } from "react";
import { X, Copy, Check, Loader2, Search, Mail, ClipboardList, Tablet } from "lucide-react";
import { createIntakePackage } from "@/lib/actions/forms";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
};

type Props = {
  customers: Customer[];
  baseUrl: string;
  onClose: () => void;
};

export function IntakePackageModal({ customers, baseUrl, onClose }: Props) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  const intakeUrl = generatedToken ? `${baseUrl}/intake/${generatedToken}` : "";

  const patientName = selectedCustomer
    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
    : newName;

  const patientEmail = selectedCustomer?.email ?? newEmail;

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patientName.trim()) {
      setError("Patient name is required");
      return;
    }
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set("customerName", patientName.trim());
    if (patientEmail) fd.set("customerEmail", patientEmail.trim());
    if (selectedCustomer) fd.set("customerId", selectedCustomer.id);

    const result = await createIntakePackage({}, fd);
    if (result.error) {
      setError(result.error);
      setPending(false);
    } else if (result.token) {
      setGeneratedToken(result.token);
      setPending(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openMailto() {
    const subject = encodeURIComponent("Your New Patient Forms — Mint Vision Optique");
    const body = encodeURIComponent(
      `Hi ${patientName.split(" ")[0] || "there"},\n\nPlease complete your new patient intake forms before your visit:\n\n${intakeUrl}\n\nThe forms take about 3–5 minutes. No account or login required.\n\nSee you soon!\nMint Vision Optique`
    );
    window.open(`mailto:${patientEmail}?subject=${subject}&body=${body}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">New Client Intake</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sends Registration · Privacy Consent · Insurance — all in one link
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!generatedToken ? (
          <form onSubmit={handleGenerate} className="p-5 space-y-4">
            {/* Existing customer search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing Patient (optional)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (!e.target.value) setSelectedCustomer(null);
                  }}
                  placeholder="Search by name or phone…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {search && !selectedCustomer && (
                <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No patients found</div>
                  ) : (
                    filtered.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setSearch(`${c.firstName} ${c.lastName}`);
                          setNewName(`${c.firstName} ${c.lastName}`);
                          setNewEmail(c.email ?? "");
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium">
                          {c.firstName} {c.lastName}
                        </span>
                        {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedCustomer && (
                <div className="mt-2 flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <span className="text-sm text-primary font-medium">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSearch("");
                      setNewName("");
                      setNewEmail("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* New patient name — shown only if no existing customer selected */}
            {!selectedCustomer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Email
                <span className="text-gray-400 font-normal ml-1">(for sending the link)</span>
              </label>
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="patient@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Package contents */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Included Forms
              </p>
              {[
                { label: "New Patient Registration", step: 1 },
                { label: "Privacy & Consent (PIPEDA)", step: 2 },
                { label: "Insurance Verification", step: 3 },
              ].map((f) => (
                <div key={f.step} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {f.step}
                  </span>
                  {f.label}
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                <ClipboardList className="w-4 h-4" />
                Create Intake Link
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-green-800">Intake package ready!</p>
              <p className="text-xs text-green-600 mt-0.5">
                For {patientName} · 3 forms in sequence
              </p>
            </div>

            {/* In-person primary action */}
            <button
              onClick={() => { window.location.href = `${intakeUrl}?handoff=1`; }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Tablet className="w-4 h-4" />
              Open on This Device (In-Person)
            </button>

            <div className="relative flex items-center gap-2">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400">or share remotely</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Copy link to share with patient:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={intakeUrl}
                  className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-mono overflow-hidden"
                />
                <button
                  onClick={copyLink}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {patientEmail && (
              <button
                onClick={openMailto}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email to {patientEmail}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
