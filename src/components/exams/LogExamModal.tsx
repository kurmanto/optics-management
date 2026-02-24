"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createExam } from "@/lib/actions/exams";
import { searchCustomers, type CustomerSearchResult } from "@/lib/actions/customers";

const EXAM_TYPES = [
  { value: "COMPREHENSIVE", label: "Comprehensive" },
  { value: "CONTACT_LENS", label: "Contact Lens" },
  { value: "FOLLOW_UP", label: "Follow-Up" },
  { value: "PEDIATRIC", label: "Pediatric" },
];

const PAYMENT_METHODS = [
  { value: "", label: "-- Select --" },
  { value: "CASH", label: "Cash" },
  { value: "DEBIT", label: "Debit" },
  { value: "CREDIT_VISA", label: "Visa" },
  { value: "CREDIT_MASTERCARD", label: "Mastercard" },
  { value: "CREDIT_AMEX", label: "Amex" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "E_TRANSFER", label: "e-Transfer" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "OTHER", label: "Other" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LogExamModal({ open, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [examType, setExamType] = useState("COMPREHENSIVE");
  const [doctorName, setDoctorName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amountBilled, setAmountBilled] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [ohipCovered, setOhipCovered] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Debounced customer search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (customerQuery.trim().length < 2 || selectedCustomer) {
      setCustomerResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCustomers(customerQuery);
        setCustomerResults(results);
        setShowDropdown(true);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [customerQuery, selectedCustomer]);

  function handleSelectCustomer(c: CustomerSearchResult) {
    setSelectedCustomer(c);
    setCustomerQuery(`${c.firstName} ${c.lastName}`);
    setShowDropdown(false);
  }

  function handleSubmit() {
    if (!selectedCustomer) {
      setError("Please select a customer");
      return;
    }
    setError("");

    startTransition(async () => {
      const result = await createExam({
        customerId: selectedCustomer.id,
        examDate,
        examType,
        doctorName: doctorName || undefined,
        paymentMethod: paymentMethod || undefined,
        amountBilled: amountBilled ? parseFloat(amountBilled) : undefined,
        amountPaid: amountPaid ? parseFloat(amountPaid) : undefined,
        ohipCovered,
        clinicalNotes: clinicalNotes || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        // Reset form
        setSelectedCustomer(null);
        setCustomerQuery("");
        setExamDate(new Date().toISOString().split("T")[0]);
        setExamType("COMPREHENSIVE");
        setDoctorName("");
        setPaymentMethod("");
        setAmountBilled("");
        setAmountPaid("");
        setOhipCovered(false);
        setClinicalNotes("");
        onClose();
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Log Exam</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Customer search */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Patient *</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                <button
                  onClick={() => { setSelectedCustomer(null); setCustomerQuery(""); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {showDropdown && customerResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium">{c.firstName} {c.lastName}</span>
                        {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
              </div>
            )}
          </div>

          {/* Date + Type row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date *</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Exam Type *</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Doctor Name</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Payment Method + OHIP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ohipCovered}
                  onChange={(e) => setOhipCovered(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">OHIP Covered</span>
              </label>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Amount Billed ($)</label>
              <input
                type="number"
                step="0.01"
                value={amountBilled}
                onChange={(e) => setAmountBilled(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Amount Paid ($)</label>
              <input
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Clinical Notes</label>
            <textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Log Exam"}
          </button>
        </div>
      </div>
    </div>
  );
}
