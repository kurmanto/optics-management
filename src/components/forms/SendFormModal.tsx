"use client";

import { useState, useActionState } from "react";
import { X, Copy, Check, Loader2, Search } from "lucide-react";
import { createFormSubmission } from "@/lib/actions/forms";
import { FormTemplateType } from "@prisma/client";

const FORM_LABELS: Record<FormTemplateType, string> = {
  NEW_PATIENT: "New Patient Registration",
  HIPAA_CONSENT: "Privacy & Consent",
  FRAME_REPAIR_WAIVER: "Frame Repair Waiver",
  INSURANCE_VERIFICATION: "Insurance Verification",
};

type Template = {
  id: string;
  type: FormTemplateType;
  name: string;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

type Props = {
  template: Template;
  customers: Customer[];
  baseUrl: string;
  onClose: () => void;
};

export function SendFormModal({ template, customers, baseUrl, onClose }: Props) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(createFormSubmission, {});

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await createFormSubmission({}, fd);
    if (result.token) {
      setGeneratedLink(`${baseUrl}/f/${result.token}`);
    }
  }

  async function copyLink() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Send Form</h2>
            <p className="text-xs text-gray-500 mt-0.5">{FORM_LABELS[template.type]}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!generatedLink ? (
          <form onSubmit={handleGenerate} className="p-5 space-y-4">
            <input type="hidden" name="templateId" value={template.id} />
            {selectedCustomer && (
              <input type="hidden" name="customerId" value={selectedCustomer.id} />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach to Patient (optional)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or phone…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {search && !selectedCustomer && (
                <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No patients found</div>
                  ) : (
                    filtered.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setSearch(`${c.firstName} ${c.lastName}`);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium">{c.firstName} {c.lastName}</span>
                        {c.phone && (
                          <span className="text-gray-400 ml-2">{c.phone}</span>
                        )}
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
                    onClick={() => { setSelectedCustomer(null); setSearch(""); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

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
                Generate Link
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-green-800">Link generated successfully!</p>
              {selectedCustomer && (
                <p className="text-xs text-green-600 mt-0.5">
                  Pre-filled for {selectedCustomer.firstName} {selectedCustomer.lastName}
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Share this link with the patient:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedLink}
                  className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-mono overflow-hidden"
                />
                <button
                  onClick={copyLink}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              The patient can complete this form on any device. No login required.
            </p>

            <button
              onClick={onClose}
              className="w-full py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
