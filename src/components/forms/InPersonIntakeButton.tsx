"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tablet, Loader2, Search, X } from "lucide-react";
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
};

export function InPersonIntakeButton({ customers, baseUrl }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  const patientName = selectedCustomer
    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
    : newName;

  async function handleStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patientName.trim()) {
      setError("Patient name is required");
      return;
    }
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set("customerName", patientName.trim());
    if (selectedCustomer?.email) fd.set("customerEmail", selectedCustomer.email);
    if (selectedCustomer) fd.set("customerId", selectedCustomer.id);

    const result = await createIntakePackage({}, fd);
    if (result.error) {
      setError(result.error);
      setPending(false);
    } else if (result.token) {
      // Navigate to handoff screen
      router.push(`/intake/${result.token}?handoff=1`);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white border border-primary/30 text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors"
      >
        <Tablet className="w-4 h-4" />
        In-Person
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Tablet className="w-4 h-4 text-primary" />
              In-Person Intake
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Opens forms on this device for the patient to fill out
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleStart} className="p-5 space-y-4">
          {/* Search existing */}
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
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
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
                  onClick={() => { setSelectedCustomer(null); setSearch(""); setNewName(""); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tablet className="w-4 h-4" />}
              {pending ? "Starting…" : "Start Intake"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
