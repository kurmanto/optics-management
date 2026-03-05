"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, User, ExternalLink, Clock } from "lucide-react";
import { createAppointment } from "@/lib/actions/appointments";
import { searchCustomers } from "@/lib/actions/customers";
import { APPOINTMENT_TYPES } from "@/lib/types/appointment";
import { formatPhone } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

type CustomerResult = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
};

type ServiceTypeOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration: number;
  color: string;
  bgColor: string;
  requiresOD: boolean;
  isActive: boolean;
};

type ProviderOption = {
  id: string;
  name: string;
  title: string;
  isOD: boolean;
};

type Props = {
  defaultScheduledAt?: string;
  defaultType?: string;
  defaultProviderId?: string | null;
  serviceTypes?: ServiceTypeOption[];
  providers?: ProviderOption[];
  onClose: () => void;
  onSuccess: () => void;
};

export function BookAppointmentModal({
  defaultScheduledAt = "",
  defaultType = "STYLING",
  defaultProviderId,
  serviceTypes = [],
  providers = [],
  onClose,
  onSuccess,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);
  const [apptType, setApptType] = useState(defaultType);
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);
  const [duration, setDuration] = useState(30);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(defaultProviderId ?? null);
  const [notes, setNotes] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const hasServiceTypes = serviceTypes.length > 0;
  const selectedServiceType = serviceTypes.find((st) => st.id === selectedServiceTypeId);

  // Filter providers by requiresOD when a service type is selected
  const availableProviders = selectedServiceType?.requiresOD
    ? providers.filter((p) => p.isOD)
    : providers;

  // Debounced customer search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || selectedCustomer) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchCustomers(query);
        setResults(r);
        setShowDropdown(true);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, selectedCustomer]);

  function selectCustomer(c: CustomerResult) {
    setSelectedCustomer(c);
    setQuery(`${c.firstName} ${c.lastName}`);
    setShowDropdown(false);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setQuery("");
    setResults([]);
  }

  function handleServiceTypeSelect(st: ServiceTypeOption) {
    setSelectedServiceTypeId(st.id);
    setDuration(st.duration);
    // Reset provider if they're no longer valid for this service type
    if (st.requiresOD && selectedProviderId) {
      const providerStillValid = providers.find((p) => p.id === selectedProviderId && p.isOD);
      if (!providerStillValid) setSelectedProviderId(null);
    }
  }

  async function handleBook() {
    if (!selectedCustomer) { setError("Please select a customer"); return; }
    if (!scheduledAt) { setError("Date and time are required"); return; }
    if (hasServiceTypes && !selectedServiceTypeId) { setError("Please select a service type"); return; }
    setError("");
    setPending(true);

    const result = await createAppointment({
      customerId: selectedCustomer.id,
      type: apptType,
      scheduledAt,
      duration,
      notes: notes || undefined,
      serviceTypeId: selectedServiceTypeId || undefined,
      providerId: selectedProviderId || undefined,
      source: "STAFF",
    });

    setPending(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Book Appointment</h2>
            <p className="text-sm text-gray-500 mt-0.5">Search for a customer to get started</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Customer search */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
          {selectedCustomer ? (
            <div className="flex items-center gap-2 px-3 py-2.5 border border-primary rounded-lg bg-primary/5">
              <User className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                {selectedCustomer.phone && (
                  <p className="text-xs text-gray-500">{formatPhone(selectedCustomer.phone)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={clearCustomer}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {showDropdown && results.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {c.phone ? formatPhone(c.phone) : c.email ?? ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && results.length === 0 && !searching && query.trim() && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-4 text-center">
                  <p className="text-sm text-gray-500 mb-2">No customers found.</p>
                  <a
                    href="/customers/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
                  >
                    Create new customer <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Service Type selector or legacy Type dropdown */}
        {hasServiceTypes ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Service Type</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {serviceTypes.filter((st) => st.isActive).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleServiceTypeSelect(st)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border p-3 transition-colors text-left",
                    selectedServiceTypeId === st.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{st.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {st.duration} min
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={apptType}
              onChange={(e) => setApptType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Provider selector */}
        {hasServiceTypes && providers.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Provider (optional)</label>
            <select
              value={selectedProviderId ?? ""}
              onChange={(e) => setSelectedProviderId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">Auto-assign</option>
              {availableProviders.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date/Time and Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={!!selectedServiceTypeId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:opacity-60"
            >
              {[15, 30, 45, 60, 90, 120].map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBook}
            disabled={pending}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {pending ? "Booking..." : "Book Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
