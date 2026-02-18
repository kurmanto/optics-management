"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Search, UserPlus, ArrowLeft, Check, Loader2, X } from "lucide-react";
import { searchCustomers, quickCreateCustomer, type CustomerSearchResult } from "@/lib/actions/customers";
import { ExternalPrescriptionUpload } from "@/components/customers/ExternalPrescriptionUpload";
import { formatPhone } from "@/lib/utils/formatters";

type Step = "find-customer" | "scan-rx" | "done";

export default function ScanRxPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("find-customer");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchCustomers(query);
      setResults(data);
      setSearching(false);
    }, 300);
  }, [query]);

  function selectCustomer(id: string, name: string) {
    setSelectedCustomer({ id, name });
    setStep("scan-rx");
  }

  async function handleQuickCreate() {
    setCreateError("");
    if (!newForm.firstName.trim() || !newForm.lastName.trim()) {
      setCreateError("First and last name are required");
      return;
    }
    setCreating(true);
    const result = await quickCreateCustomer(newForm);
    setCreating(false);
    if ("error" in result) {
      setCreateError(result.error);
      return;
    }
    setSelectedCustomer({ id: result.id, name: result.name });
    setStep("scan-rx");
  }

  function handleDone() {
    setStep("done");
  }

  function resetFlow() {
    setStep("find-customer");
    setQuery("");
    setResults([]);
    setSelectedCustomer(null);
    setShowNewForm(false);
    setNewForm({ firstName: "", lastName: "", phone: "", email: "" });
    setCreateError("");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Scan Rx</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">Take a photo or upload a patient&apos;s physical prescription form</p>
      </div>

      {/* Step 1 — Find or create customer */}
      {step === "find-customer" && (
        <div className="space-y-4">
          {!showNewForm ? (
            <>
              {/* Search input */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">Find Patient</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, phone, or email…"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>

                {/* Results */}
                {results.length > 0 && (
                  <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                    {results.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => selectCustomer(c.id, `${c.firstName} ${c.lastName}`)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {c.firstName} {c.lastName}
                          </span>
                          {(c.phone || c.email) && (
                            <span className="ml-2 text-xs text-gray-400">
                              {c.phone ? formatPhone(c.phone) : c.email}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {query.trim() && !searching && results.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">No patients found for &ldquo;{query}&rdquo;</p>
                )}
              </div>

              {/* New patient button */}
              <div className="text-center">
                <span className="text-xs text-gray-400">or</span>
              </div>
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                New patient — quick create
              </button>
            </>
          ) : (
            /* Quick create form */
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">New Patient</h2>
                <button
                  onClick={() => { setShowNewForm(false); setCreateError(""); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    autoFocus
                    value={newForm.firstName}
                    onChange={(e) => setNewForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Jane"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    value={newForm.lastName}
                    onChange={(e) => setNewForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={newForm.phone}
                    onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="416-555-0100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    value={newForm.email}
                    onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}

              <button
                onClick={handleQuickCreate}
                disabled={creating}
                className="w-full bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creating ? "Creating…" : "Create Patient & Continue"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Scan Rx */}
      {step === "scan-rx" && selectedCustomer && (
        <div className="space-y-4">
          {/* Patient banner */}
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide">Patient</p>
              <p className="text-sm font-semibold text-indigo-900">{selectedCustomer.name}</p>
            </div>
            <button
              onClick={() => { setStep("find-customer"); setSelectedCustomer(null); }}
              className="text-xs text-indigo-400 hover:text-indigo-600 underline"
            >
              Change
            </button>
          </div>

          {/* Upload component */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <ExternalPrescriptionUpload
              customerId={selectedCustomer.id}
              onSaved={handleDone}
            />
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === "done" && selectedCustomer && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Prescription saved</h2>
            <p className="text-sm text-gray-500 mt-1">
              Rx for <span className="font-medium">{selectedCustomer.name}</span> has been recorded and the scan stored.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={resetFlow}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Scan another
            </button>
            <button
              onClick={() => router.push(`/customers/${selectedCustomer.id}`)}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              View patient
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
