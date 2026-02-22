"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, User, ExternalLink } from "lucide-react";
import { createAppointment } from "@/lib/actions/appointments";
import { searchCustomers } from "@/lib/actions/customers";
import { APPOINTMENT_TYPES } from "@/lib/types/appointment";
import { formatPhone } from "@/lib/utils/formatters";

type CustomerResult = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
};

type Props = {
  defaultScheduledAt?: string; // "YYYY-MM-DDTHH:MM"
  defaultType?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function BookAppointmentModal({
  defaultScheduledAt = "",
  defaultType = "STYLING",
  onClose,
  onSuccess,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [apptType, setApptType] = useState(defaultType);
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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

  async function handleBook() {
    if (!selectedCustomer) { setError("Please select a customer"); return; }
    if (!scheduledAt) { setError("Date and time are required"); return; }
    setError("");
    setPending(true);

    const result = await createAppointment({
      customerId: selectedCustomer.id,
      type: apptType,
      scheduledAt,
      duration,
      notes: notes || undefined,
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
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

        {/* Appointment fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
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
