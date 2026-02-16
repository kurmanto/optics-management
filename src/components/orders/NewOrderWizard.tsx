"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/actions/orders";
import { formatCurrency } from "@/lib/utils/formatters";
import { Plus, Trash2, ChevronRight, ChevronLeft } from "lucide-react";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

type Prescription = {
  id: string;
  date: Date;
  odSphere: number | null;
  osSphere: number | null;
};

type InsurancePolicy = {
  id: string;
  providerName: string;
  policyNumber: string | null;
};

type LineItem = {
  type: "FRAME" | "LENS" | "COATING" | "CONTACT_LENS" | "EXAM" | "ACCESSORY" | "DISCOUNT" | "OTHER";
  description: string;
  quantity: number;
  unitPriceCustomer: number;
  unitPriceReal: number;
  notes?: string;
};

type Props = {
  customer?: Customer;
  allCustomers: Customer[];
  prescriptions?: Prescription[];
  insurancePolicies?: InsurancePolicy[];
};

const LINE_ITEM_TYPES = [
  { value: "FRAME", label: "Frame" },
  { value: "LENS", label: "Lenses" },
  { value: "COATING", label: "Coating" },
  { value: "CONTACT_LENS", label: "Contact Lenses" },
  { value: "EXAM", label: "Exam" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "DISCOUNT", label: "Discount" },
  { value: "OTHER", label: "Other" },
] as const;

const ORDER_TYPES = [
  { value: "GLASSES", label: "Glasses" },
  { value: "CONTACTS", label: "Contact Lenses" },
  { value: "SUNGLASSES", label: "Sunglasses" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "EXAM_ONLY", label: "Exam Only" },
] as const;

const PAYMENT_METHODS = [
  "CASH", "DEBIT", "CREDIT_VISA", "CREDIT_MASTERCARD", "CREDIT_AMEX",
  "CHEQUE", "E_TRANSFER", "INSURANCE", "OTHER"
];

export function NewOrderWizard({ customer, allCustomers, prescriptions = [], insurancePolicies = [] }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Step 1: Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState(customer?.id || "");
  const [customerSearch, setCustomerSearch] = useState(
    customer ? `${customer.lastName}, ${customer.firstName}` : ""
  );
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Step 2: Order Details
  const [orderType, setOrderType] = useState<string>("GLASSES");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [insurancePolicyId, setInsurancePolicyId] = useState("");
  const [isDualInvoice, setIsDualInvoice] = useState(false);
  const [dueDate, setDueDate] = useState("");

  // Step 3: Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { type: "FRAME", description: "", quantity: 1, unitPriceCustomer: 0, unitPriceReal: 0 },
    { type: "LENS", description: "", quantity: 1, unitPriceCustomer: 0, unitPriceReal: 0 },
  ]);

  // Step 4: Frame Details
  const [frameBrand, setFrameBrand] = useState("");
  const [frameModel, setFrameModel] = useState("");
  const [frameColor, setFrameColor] = useState("");
  const [lensType, setLensType] = useState("");
  const [lensCoating, setLensCoating] = useState("");
  const [frameWholesale, setFrameWholesale] = useState("");

  // Step 5: Payment
  const [depositCustomer, setDepositCustomer] = useState(0);
  const [depositReal, setDepositReal] = useState(0);
  const [notes, setNotes] = useState("");
  const [labNotes, setLabNotes] = useState("");

  const totalCustomer = lineItems.reduce(
    (sum, item) => sum + item.unitPriceCustomer * item.quantity, 0
  );
  const totalReal = lineItems.reduce(
    (sum, item) => sum + item.unitPriceReal * item.quantity, 0
  );

  const filteredCustomers = allCustomers.filter((c) =>
    customerSearch.length > 1
      ? `${c.lastName} ${c.firstName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearch.replace(/\D/g, "")))
      : false
  ).slice(0, 8);

  function addLineItem() {
    setLineItems([...lineItems, {
      type: "OTHER",
      description: "",
      quantity: 1,
      unitPriceCustomer: 0,
      unitPriceReal: 0,
    }]);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: unknown) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }

  async function handleSubmit() {
    if (!selectedCustomerId) {
      setError("Please select a customer");
      setStep(1);
      return;
    }
    if (lineItems.length === 0 || lineItems.every((i) => !i.description)) {
      setError("Please add at least one line item");
      setStep(3);
      return;
    }

    setSaving(true);
    setError("");

    const result = await createOrder({
      customerId: selectedCustomerId,
      prescriptionId: prescriptionId || undefined,
      insurancePolicyId: insurancePolicyId || undefined,
      type: orderType as any,
      isDualInvoice,
      frameBrand: frameBrand || undefined,
      frameModel: frameModel || undefined,
      frameColor: frameColor || undefined,
      frameWholesale: frameWholesale ? parseFloat(frameWholesale) : undefined,
      lensType: lensType || undefined,
      lensCoating: lensCoating || undefined,
      depositCustomer,
      depositReal: isDualInvoice ? depositReal : depositCustomer,
      notes: notes || undefined,
      labNotes: labNotes || undefined,
      dueDate: dueDate || undefined,
      lineItems: lineItems.filter((i) => i.description),
    });

    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }

    router.push(`/orders/${result.id}`);
  }

  const steps = [
    { n: 1, label: "Customer" },
    { n: 2, label: "Details" },
    { n: 3, label: "Items" },
    { n: 4, label: "Frame & Lens" },
    { n: 5, label: "Payment" },
  ];

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <button
              onClick={() => s.n < step && setStep(s.n)}
              className={`flex items-center gap-2 ${s.n < step ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s.n === step
                    ? "bg-primary text-white"
                    : s.n < step
                    ? "bg-primary/20 text-primary"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s.n}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${
                  s.n === step ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-gray-200 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Step 1: Customer */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Select Customer</h2>
          <div className="relative">
            <input
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
                if (!e.target.value) setSelectedCustomerId("");
              }}
              placeholder="Search by name or phone..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerSearch(`${c.lastName}, ${c.firstName}`);
                      setShowCustomerDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium">{c.lastName}, {c.firstName}</span>
                    {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedCustomerId && (
            <p className="text-sm text-green-600 font-medium">✓ Customer selected</p>
          )}
          {!selectedCustomerId && (
            <p className="text-sm text-gray-500">
              Customer not found?{" "}
              <a href="/customers/new" target="_blank" className="text-primary hover:underline">
                Add new customer
              </a>
            </p>
          )}
        </div>
      )}

      {/* Step 2: Order Details */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Order Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setOrderType(t.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    orderType === t.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {prescriptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prescription (optional)
              </label>
              <select
                value={prescriptionId}
                onChange={(e) => setPrescriptionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">No prescription selected</option>
                {prescriptions.map((rx) => (
                  <option key={rx.id} value={rx.id}>
                    {new Date(rx.date).toLocaleDateString()} — OD: {rx.odSphere ?? "—"} / OS: {rx.osSphere ?? "—"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {insurancePolicies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Policy (optional)
              </label>
              <select
                value={insurancePolicyId}
                onChange={(e) => setInsurancePolicyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">No insurance</option>
                {insurancePolicies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.providerName} {p.policyNumber && `(${p.policyNumber})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDualInvoice}
              onChange={(e) => setIsDualInvoice(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Dual invoice</span>
              <p className="text-xs text-gray-500">Generate separate customer and internal invoices</p>
            </div>
          </label>
        </div>
      )}

      {/* Step 3: Line Items */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Line Items</h2>

          <div className="space-y-3">
            {lineItems.map((item, i) => (
              <div
                key={i}
                className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50/50"
              >
                <div className="flex items-center justify-between">
                  <select
                    value={item.type}
                    onChange={(e) => updateLineItem(i, "type", e.target.value)}
                    className="text-xs font-medium bg-transparent border-0 focus:outline-none text-primary cursor-pointer"
                  >
                    {LINE_ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  value={item.description}
                  onChange={(e) => updateLineItem(i, "description", e.target.value)}
                  placeholder="Description (e.g. Essilor Varilux X, PLANO AR coating)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {isDualInvoice ? "Price (Customer)" : "Price"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPriceCustomer || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateLineItem(i, "unitPriceCustomer", val);
                        if (!isDualInvoice) updateLineItem(i, "unitPriceReal", val);
                      }}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>
                  {isDualInvoice && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Price (Internal)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPriceReal || ""}
                        onChange={(e) => updateLineItem(i, "unitPriceReal", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="text-xs text-right text-gray-500">
                  Subtotal: <span className="font-medium text-gray-900">
                    {formatCurrency(item.unitPriceCustomer * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add item
          </button>

          <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold">
            <span className="text-gray-700">Total</span>
            <span className="text-gray-900">{formatCurrency(totalCustomer)}</span>
          </div>
        </div>
      )}

      {/* Step 4: Frame & Lens Details */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Frame & Lens Details</h2>
          <p className="text-xs text-gray-500">
            These details are copied to the order record and remain fixed even if inventory changes.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                value={frameBrand}
                onChange={(e) => setFrameBrand(e.target.value)}
                placeholder="e.g. Ray-Ban"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                value={frameModel}
                onChange={(e) => setFrameModel(e.target.value)}
                placeholder="e.g. RB5154"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                value={frameColor}
                onChange={(e) => setFrameColor(e.target.value)}
                placeholder="e.g. Matte Black"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={frameWholesale}
                onChange={(e) => setFrameWholesale(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lens Type</label>
              <input
                value={lensType}
                onChange={(e) => setLensType(e.target.value)}
                placeholder="e.g. Progressive, Single Vision"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lens Coating</label>
              <input
                value={lensCoating}
                onChange={(e) => setLensCoating(e.target.value)}
                placeholder="e.g. AR, Blue Light, Transitions"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lab Notes</label>
            <textarea
              value={labNotes}
              onChange={(e) => setLabNotes(e.target.value)}
              rows={3}
              placeholder="Instructions for the lab..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 5: Payment & Summary */}
      {step === 5 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-2">
            <h2 className="font-semibold text-gray-900 mb-3">Order Summary</h2>
            {lineItems.filter((i) => i.description).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.description}</span>
                <span className="font-medium">{formatCurrency(item.unitPriceCustomer * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totalCustomer)}</span>
            </div>
            {isDualInvoice && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Internal Total</span>
                <span>{formatCurrency(totalReal)}</span>
              </div>
            )}
          </div>

          {/* Deposit */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Deposit / Payment</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isDualInvoice ? "Deposit (Customer)" : "Deposit Amount"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={totalCustomer}
                  value={depositCustomer || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setDepositCustomer(val);
                    if (!isDualInvoice) setDepositReal(val);
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {isDualInvoice && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deposit (Internal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={depositReal || ""}
                    onChange={(e) => setDepositReal(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {depositCustomer > 0 && (
              <div className="text-sm text-gray-600">
                Balance due: <span className="font-semibold text-gray-900">
                  {formatCurrency(totalCustomer - depositCustomer)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Notes</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Staff-only notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={() => step > 1 && setStep(step - 1)}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !selectedCustomerId) {
                setError("Please select a customer first");
                return;
              }
              setError("");
              setStep(step + 1);
            }}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-150"
          >
            {saving ? "Creating..." : "Create Order"}
          </button>
        )}
      </div>
    </div>
  );
}
