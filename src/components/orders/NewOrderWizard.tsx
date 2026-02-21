"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/actions/orders";
import { emailInvoice as emailInvoiceAction } from "@/lib/actions/email";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  Plus, Trash2, ChevronRight, ChevronLeft, Search, X,
  Glasses, Sun, RefreshCw, Eye, Printer, Mail, CheckCircle
} from "lucide-react";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email?: string | null;
};

type Prescription = {
  id: string;
  date: Date;
  odSphere: number | null;
  osSphere: number | null;
  source?: string;
};

type InsurancePolicy = {
  id: string;
  providerName: string;
  policyNumber: string | null;
};

type LineItem = {
  type: "FRAME" | "LENS" | "COATING" | "CONTACT_LENS" | "EXAM" | "ACCESSORY" | "OTHER";
  description: string;
  quantity: number;
  unitPriceCustomer: number;
  unitPriceReal: number;
  notes?: string;
};

type InventoryItem = {
  id: string;
  brand: string;
  model: string;
  color: string | null;
  sku: string | null;
  retailPrice: number | null;
  wholesaleCost: number | null;
  eyeSize?: number | null;
  bridgeSize?: number | null;
  templeLength?: number | null;
};

type Props = {
  customer?: Customer;
  allCustomers: Customer[];
  prescriptions?: Prescription[];
  insurancePolicies?: InsurancePolicy[];
  inventoryItems?: InventoryItem[];
};

const LINE_ITEM_TYPES = [
  { value: "FRAME", label: "Frame" },
  { value: "LENS", label: "Lenses" },
  { value: "COATING", label: "Coating" },
  { value: "CONTACT_LENS", label: "Contact Lenses" },
  { value: "EXAM", label: "Exam" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "OTHER", label: "Other" },
] as const;

const ORDER_CATEGORIES = [
  { value: "complete", label: "Complete (Frame + Lens)", icon: Glasses, desc: "Frame with prescription lenses" },
  { value: "rx_sunglasses", label: "Rx Sunglasses", icon: Sun, desc: "Sunglasses with prescription" },
  { value: "non_rx_sunglasses", label: "Non-Rx Sunglasses", icon: Sun, desc: "Sunglasses, no prescription" },
  { value: "lens_update", label: "Lens Update", icon: RefreshCw, desc: "New lenses for existing frame" },
  { value: "contact_lenses", label: "Contact Lenses", icon: Eye, desc: "Contact lens order" },
  { value: "eye_exam", label: "Eye Exam", icon: Eye, desc: "Exam only" },
] as const;

const LENS_TYPES = [
  { value: "single_vision", label: "Single Vision" },
  { value: "progressive", label: "Progressive" },
] as const;

const LENS_DESIGNS = [
  { value: "entry", label: "Entry", desc: "Standard lens" },
  { value: "signature", label: "Signature", desc: "Mid-tier premium" },
  { value: "elite", label: "Elite", desc: "Top tier premium" },
] as const;

const LENS_ADDONS = [
  { value: "crizal_blue_light", label: "Crizal Blue Light (Screen Protect)" },
  { value: "max_clarity", label: "Max Clarity (AR)" },
  { value: "lens_thinning_basic", label: "Lens Thinning Basic" },
  { value: "lens_thinning_signature", label: "Lens Thinning Signature" },
  { value: "lens_thinning_elite", label: "Lens Thinning Elite" },
  { value: "blue_select", label: "BlueSelect" },
  { value: "crizal_sun_protect", label: "Crizal SunProtect" },
  { value: "transitions", label: "Transitions" },
] as const;

const NEEDS_LENS_CONFIG = ["complete", "rx_sunglasses", "lens_update"];
const NEEDS_FRAME = ["complete", "rx_sunglasses", "non_rx_sunglasses", "lens_update"];
const NEEDS_EXAM_DETAILS = ["eye_exam"];

const EXAM_TYPES = [
  { value: "adult", label: "Complete Adult Eye Exam", desc: "Standard comprehensive exam" },
  { value: "child", label: "Child/Teenager (Under 19)", desc: "Pediatric examination" },
  { value: "senior", label: "Senior (Above 65)", desc: "Senior comprehensive exam" },
] as const;

const EXAM_PAYMENT_METHODS = [
  { value: "insurance_full", label: "Insurance Full", desc: "Fully covered by insurance" },
  { value: "insurance_partial", label: "Insurance Partial", desc: "Partially covered" },
  { value: "ohip", label: "OHIP", desc: "OHIP covered" },
  { value: "self_pay", label: "Self-bill / Out of Pocket", desc: "Patient pays directly" },
] as const;

function getOrderType(category: string): "GLASSES" | "CONTACTS" | "SUNGLASSES" | "ACCESSORIES" | "EXAM_ONLY" {
  if (category === "contact_lenses") return "CONTACTS";
  if (category === "eye_exam") return "EXAM_ONLY";
  if (category === "rx_sunglasses" || category === "non_rx_sunglasses") return "SUNGLASSES";
  return "GLASSES";
}

export function NewOrderWizard({
  customer,
  allCustomers,
  prescriptions = [],
  insurancePolicies = [],
  inventoryItems = [],
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [inventorySearches, setInventorySearches] = useState<Record<number, string>>({});
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // Step 1: Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState(customer?.id || "");
  const [customerSearch, setCustomerSearch] = useState(
    customer ? `${customer.lastName}, ${customer.firstName}` : ""
  );
  const [isDualInvoice, setIsDualInvoice] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState("");
  const [insurancePolicyId, setInsurancePolicyId] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Step 2: Order Category
  const [orderCategory, setOrderCategory] = useState("");

  // Step 3: Lens config
  const [lensType, setLensType] = useState("");
  const [lensDesign, setLensDesign] = useState("");
  const [lensAddOns, setLensAddOns] = useState<string[]>([]);

  // Step 4: Frame details
  const [frameBrand, setFrameBrand] = useState("");
  const [frameModel, setFrameModel] = useState("");
  const [frameColor, setFrameColor] = useState("");
  const [frameColourCode, setFrameColourCode] = useState("");
  const [frameEyeSize, setFrameEyeSize] = useState("");
  const [frameBridge, setFrameBridgeState] = useState("");
  const [frameTemple, setFrameTemple] = useState("");
  const [frameWholesale, setFrameWholesale] = useState("");
  const [frameSku, setFrameSku] = useState("");
  const [frameInventorySearch, setFrameInventorySearch] = useState("");

  // Step 5: Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { type: "FRAME", description: "", quantity: 1, unitPriceCustomer: 0, unitPriceReal: 0 },
    { type: "LENS", description: "", quantity: 1, unitPriceCustomer: 0, unitPriceReal: 0 },
  ]);

  // Step 6: Payment
  const [depositCustomer, setDepositCustomer] = useState(0);
  const [depositReal, setDepositReal] = useState(0);
  const [insuranceCoverage, setInsuranceCoverage] = useState(0);
  const [referralCredit, setReferralCredit] = useState(0);
  const [notes, setNotes] = useState("");
  const [labNotes, setLabNotes] = useState("");

  // Step 7: Completion
  const [printInvoice, setPrintInvoice] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState(false);
  const [printWorkOrder, setPrintWorkOrder] = useState(true);

  // Eye exam fields
  const [examType, setExamType] = useState("");
  const [examPaymentMethod, setExamPaymentMethod] = useState("");
  const [insuranceCoveredAmount, setInsuranceCoveredAmount] = useState(0);

  // Add-another-order state
  const [createdOrder, setCreatedOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  const selectedCustomer = allCustomers.find((c) => c.id === selectedCustomerId);

  const lineTotal = lineItems.reduce((s, i) => s + i.unitPriceCustomer * i.quantity, 0);
  const lineTotalReal = lineItems.reduce((s, i) => s + i.unitPriceReal * i.quantity, 0);
  const deductions = insuranceCoverage + referralCredit;
  const totalCustomer = Math.max(0, lineTotal - deductions);
  const totalReal = Math.max(0, lineTotalReal - deductions);
  const balanceDue = Math.max(0, totalCustomer - depositCustomer);

  const needsLensConfig = NEEDS_LENS_CONFIG.includes(orderCategory);
  const needsFrame = NEEDS_FRAME.includes(orderCategory);
  const needsExamDetails = NEEDS_EXAM_DETAILS.includes(orderCategory);

  // Compute actual wizard steps based on category
  function buildSteps() {
    const s: Array<{ n: number; label: string }> = [
      { n: 1, label: "Customer" },
      { n: 2, label: "Order Type" },
    ];
    let n = 3;
    if (needsExamDetails) { s.push({ n, label: "Exam Details" }); n++; }
    if (needsLensConfig) { s.push({ n, label: "Lens Config" }); n++; }
    if (needsFrame) { s.push({ n, label: "Frame" }); n++; }
    s.push({ n, label: "Items" }); n++;
    s.push({ n, label: "Payment" }); n++;
    s.push({ n, label: "Review" });
    return s;
  }
  const steps = buildSteps();

  // Helper to get the step number for a label
  function stepN(label: string) {
    return steps.find((s) => s.label === label)?.n ?? 999;
  }

  // Flat step navigation: map visual step to logical step
  // We just track step as a flat number 1-N
  const maxStep = steps[steps.length - 1].n;

  const filteredCustomers = allCustomers
    .filter(
      (c) =>
        customerSearch.length === 0 ||
        `${c.lastName} ${c.firstName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearch.replace(/\D/g, "")))
    )
    .slice(0, 10);

  function addLineItem() {
    setLineItems(prev => [...prev, { type: "OTHER", description: "", quantity: 1, unitPriceCustomer: 0, unitPriceReal: 0 }]);
  }

  function removeLineItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: unknown) {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function toggleAddon(addon: string) {
    setLensAddOns((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    );
  }

  function selectInventoryFrame(inv: InventoryItem) {
    setFrameBrand(inv.brand);
    setFrameModel(inv.model);
    setFrameColor(inv.color || "");
    setFrameSku(inv.sku || "");
    setFrameWholesale(inv.wholesaleCost ? String(inv.wholesaleCost) : "");
    if (inv.eyeSize) setFrameEyeSize(String(inv.eyeSize));
    if (inv.bridgeSize) setFrameBridgeState(String(inv.bridgeSize));
    if (inv.templeLength) setFrameTemple(String(inv.templeLength));

    // Auto-fill frame line item
    const frameDesc = `${inv.brand} ${inv.model}${inv.color ? ` — ${inv.color}` : ""}`;
    const frameIdx = lineItems.findIndex((i) => i.type === "FRAME");
    if (frameIdx >= 0) {
      const updated = [...lineItems];
      updated[frameIdx] = {
        ...updated[frameIdx],
        description: frameDesc,
        unitPriceCustomer: inv.retailPrice ?? 0,
        unitPriceReal: isDualInvoice ? (inv.wholesaleCost ?? 0) : (inv.retailPrice ?? 0),
      };
      setLineItems(updated);
    }
    setFrameInventorySearch("");
  }

  function resetForAnotherOrder() {
    setOrderCategory("");
    setExamType("");
    setExamPaymentMethod("");
    setInsuranceCoveredAmount(0);
    setLensType("");
    setLensDesign("");
    setLensAddOns([]);
    setFrameBrand("");
    setFrameModel("");
    setFrameColor("");
    setFrameColourCode("");
    setFrameEyeSize("");
    setFrameBridgeState("");
    setFrameTemple("");
    setFrameWholesale("");
    setFrameSku("");
    setFrameInventorySearch("");
    setLineItems([
      { type: "FRAME", description: "", quantity: 1, unitPriceCustomer: 0, unitPriceReal: 0 },
      { type: "LENS", description: "", quantity: 1, unitPriceCustomer: 0, unitPriceReal: 0 },
    ]);
    setDepositCustomer(0);
    setDepositReal(0);
    setInsuranceCoverage(0);
    setReferralCredit(0);
    setNotes("");
    setLabNotes("");
    setInventorySearches({});
    setCreatedOrder(null);
    setError("");
    setStep(2);
  }

  function handleNext() {
    if (step === 1 && !selectedCustomerId) {
      setError("Please select a customer first");
      return;
    }
    if (step === 2 && !orderCategory) {
      setError("Please select an order type");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!selectedCustomerId) {
      setError("Please select a customer");
      setStep(1);
      return;
    }

    setSaving(true);
    setError("");

    const result = await createOrder({
      customerId: selectedCustomerId,
      prescriptionId: prescriptionId || undefined,
      insurancePolicyId: insurancePolicyId || undefined,
      type: getOrderType(orderCategory),
      orderTypes: [getOrderType(orderCategory)],
      orderCategory,
      isDualInvoice,
      frameBrand: frameBrand || undefined,
      frameModel: frameModel || undefined,
      frameColor: frameColor || undefined,
      frameSku: frameSku || undefined,
      frameWholesale: frameWholesale ? parseFloat(frameWholesale) : undefined,
      frameEyeSize: frameEyeSize || undefined,
      frameBridge: frameBridge || undefined,
      frameTemple: frameTemple || undefined,
      frameColourCode: frameColourCode || undefined,
      lensType: lensType || undefined,
      lensCoating: undefined,
      lensDesign: lensDesign || undefined,
      lensAddOns,
      insuranceCoverage: insuranceCoverage || undefined,
      referralCredit: referralCredit || undefined,
      depositCustomer,
      depositReal: isDualInvoice ? depositReal : depositCustomer,
      notes: notes || undefined,
      labNotes: labNotes || undefined,
      dueDate: dueDate || undefined,
      examType: examType || undefined,
      examPaymentMethod: examPaymentMethod || undefined,
      insuranceCoveredAmount: insuranceCoveredAmount || undefined,
      lineItems: lineItems.filter((i) => i.description),
    });

    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }

    // Send email invoice in background if requested
    if (emailInvoice) {
      emailInvoiceAction(result.id, "customer").catch(() => {});
    }

    setSaving(false);

    // Auto-navigate to work order page with auto-print if requested (non-exam orders only)
    if (printWorkOrder && !needsExamDetails) {
      router.push(`/orders/${result.id}/work-order?autoprint=true`);
      return;
    }

    // Show success overlay
    setCreatedOrder({ id: result.id, orderNumber: result.orderNumber });
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => s.n < step && setStep(s.n)}
              className={`flex flex-col items-center gap-1 flex-shrink-0 ${s.n < step ? "cursor-pointer" : "cursor-default"}`}
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
                {s.n < step ? "✓" : s.n}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  s.n === step ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-1.5 mb-4" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ── STEP 1: Customer ── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Select Customer</h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                if (!e.target.value) setSelectedCustomerId("");
              }}
              placeholder="Search by name or phone..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="border border-gray-100 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-gray-500">No customers match your search.</p>
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Add &ldquo;{customerSearch}&rdquo; as new customer
                  </button>
                )}
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerSearch(`${c.lastName}, ${c.firstName}`);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-50 last:border-0 text-left transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? "bg-primary" : "bg-gray-200"}`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900">{c.lastName}, {c.firstName}</span>
                    </div>
                    {c.phone && <span className="text-xs text-gray-400 flex-shrink-0">{c.phone}</span>}
                  </button>
                );
              })
            )}
          </div>

          {/* New customer inline form */}
          {showNewCustomerForm && (
            <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Quick Add Customer</h3>
                <button type="button" onClick={() => setShowNewCustomerForm(false)}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Add the customer to PMS first, then search for them here.
              </p>
              <a
                href="/customers/new"
                target="_blank"
                className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
              >
                Open New Customer form →
              </a>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {selectedCustomer ? (
              <div className="space-y-0.5">
                <p className="text-sm text-green-600 font-medium">
                  ✓ {selectedCustomer.lastName}, {selectedCustomer.firstName}
                </p>
                {selectedCustomer.phone && (
                  <p className="text-xs text-gray-400">{selectedCustomer.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No customer selected</p>
            )}
            {!showNewCustomerForm && (
              <button
                type="button"
                onClick={() => setShowNewCustomerForm(true)}
                className="text-xs text-primary hover:underline"
              >
                + New customer
              </button>
            )}
          </div>

          {/* Dual invoice toggle */}
          <div className="border border-gray-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDualInvoice}
                onChange={(e) => setIsDualInvoice(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">Dual Invoice</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Generate separate customer-facing and internal invoices with different prices.
                  Use for insurance billing where customer price differs from actual cost.
                </p>
              </div>
            </label>
          </div>

          {/* Prescription + Insurance (if customer selected) */}
          {selectedCustomerId && prescriptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prescription</label>
              <select
                value={prescriptionId}
                onChange={(e) => setPrescriptionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">No prescription</option>
                {prescriptions.map((rx) => (
                  <option key={rx.id} value={rx.id}>
                    {new Date(rx.date).toLocaleDateString()} — OD: {rx.odSphere ?? "—"} / OS: {rx.osSphere ?? "—"}
                    {rx.source === "EXTERNAL" ? " [External]" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCustomerId && insurancePolicies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Policy</label>
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
        </div>
      )}

      {/* ── STEP 2: Order Type ── */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">What type of order is this?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ORDER_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const selected = orderCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setOrderCategory(cat.value)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${selected ? "text-primary" : "text-gray-400"}`} />
                  <div>
                    <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-gray-900"}`}>
                      {cat.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
                  </div>
                  {selected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP: Exam Details (eye exam only) ── */}
      {step === stepN("Exam Details") && needsExamDetails && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Exam Details</h2>

          {/* Exam Type */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Exam Type</h3>
            <div className="space-y-2">
              {EXAM_TYPES.map((et) => (
                <button
                  key={et.value}
                  type="button"
                  onClick={() => {
                    setExamType(et.value);
                    setLineItems([{ type: "EXAM", description: et.label, quantity: 1, unitPriceCustomer: 0, unitPriceReal: 0 }]);
                  }}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    examType === et.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Eye className={`w-5 h-5 mt-0.5 flex-shrink-0 ${examType === et.value ? "text-primary" : "text-gray-400"}`} />
                  <div>
                    <p className={`text-sm font-semibold ${examType === et.value ? "text-primary" : "text-gray-900"}`}>{et.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{et.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Method</h3>
            <div className="space-y-2">
              {EXAM_PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setExamPaymentMethod(pm.value)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    examPaymentMethod === pm.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 ${examPaymentMethod === pm.value ? "border-primary bg-primary" : "border-gray-300"}`} />
                  <div>
                    <p className={`text-sm font-semibold ${examPaymentMethod === pm.value ? "text-primary" : "text-gray-900"}`}>{pm.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pm.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Insurance amount input for partial */}
          {examPaymentMethod === "insurance_partial" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Covered by Insurance ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={insuranceCoveredAmount || ""}
                onChange={(e) => setInsuranceCoveredAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {insuranceCoveredAmount > 0 && (
                <p className="text-xs text-gray-500 mt-1">Patient pays the balance.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Lens Configuration (conditional) ── */}
      {step === stepN("Lens Config") && needsLensConfig && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Lens Configuration</h2>

          {/* 3a: Lens Type */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lens Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {LENS_TYPES.map((lt) => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => setLensType(lt.value)}
                  className={`py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    lensType === lt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3b: Lens Design */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lens Design</h3>
            <div className="grid grid-cols-3 gap-3">
              {LENS_DESIGNS.map((ld) => (
                <button
                  key={ld.value}
                  type="button"
                  onClick={() => setLensDesign(ld.value)}
                  className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border-2 text-sm transition-all ${
                    lensDesign === ld.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={`font-bold text-base ${lensDesign === ld.value ? "text-primary" : "text-gray-700"}`}>
                    {ld.label}
                  </span>
                  <span className="text-xs text-gray-500">{ld.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3c: Add-ons */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add-Ons (optional)</h3>
            <div className="space-y-2">
              {LENS_ADDONS.map((addon) => (
                <label key={addon.value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={lensAddOns.includes(addon.value)}
                    onChange={() => toggleAddon(addon.value)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{addon.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: Frame Details (conditional) ── */}
      {step === stepN("Frame") && needsFrame && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Frame Details</h2>
          <p className="text-xs text-gray-500">
            Copied to the order at time of sale. Remains fixed if inventory changes.
          </p>

          {/* Inventory browser */}
          {inventoryItems.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Browse Inventory</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={frameInventorySearch}
                  onChange={(e) => setFrameInventorySearch(e.target.value)}
                  placeholder="Search frames..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {frameInventorySearch && (
                <div className="border border-gray-100 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {inventoryItems
                    .filter((inv) =>
                      `${inv.brand} ${inv.model} ${inv.color || ""} ${inv.sku || ""}`
                        .toLowerCase()
                        .includes(frameInventorySearch.toLowerCase())
                    )
                    .slice(0, 8)
                    .map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => selectInventoryFrame(inv)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm border-b border-gray-50 last:border-0 text-left hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900">{inv.brand} {inv.model}</span>
                          {inv.color && <span className="text-gray-400 text-xs ml-1.5">{inv.color}</span>}
                          {inv.sku && <span className="text-gray-400 text-xs ml-1.5">· {inv.sku}</span>}
                        </div>
                        {inv.retailPrice && (
                          <span className="text-xs font-semibold text-gray-700">{formatCurrency(inv.retailPrice)}</span>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
              <input value={frameBrand} onChange={(e) => setFrameBrand(e.target.value)} placeholder="Ray-Ban" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
              <input value={frameModel} onChange={(e) => setFrameModel(e.target.value)} placeholder="RB5154" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Colour</label>
              <input value={frameColor} onChange={(e) => setFrameColor(e.target.value)} placeholder="Matte Black" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Colour Code</label>
              <input value={frameColourCode} onChange={(e) => setFrameColourCode(e.target.value)} placeholder="e.g. 2000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Eye Size</label>
              <input value={frameEyeSize} onChange={(e) => setFrameEyeSize(e.target.value)} placeholder="e.g. 54" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bridge</label>
              <input value={frameBridge} onChange={(e) => setFrameBridgeState(e.target.value)} placeholder="e.g. 18" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Temple</label>
              <input value={frameTemple} onChange={(e) => setFrameTemple(e.target.value)} placeholder="e.g. 145" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Wholesale Cost</label>
              <input type="number" min="0" step="0.01" value={frameWholesale} onChange={(e) => setFrameWholesale(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Lab Notes</label>
            <textarea value={labNotes} onChange={(e) => setLabNotes(e.target.value)} rows={2} placeholder="Instructions for the lab..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
        </div>
      )}

      {/* ── STEP: Line Items ── */}
      {step === stepN("Items") && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Line Items</h2>

          <div className="space-y-4">
            {lineItems.map((item, i) => {
              const search = inventorySearches[i] || "";
              const filtered = inventoryItems
                .filter((inv) =>
                  search.length === 0 ||
                  `${inv.brand} ${inv.model} ${inv.color || ""} ${inv.sku || ""}`.toLowerCase().includes(search.toLowerCase())
                )
                .slice(0, 8);

              return (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Type</label>
                    <select
                      value={item.type}
                      onChange={(e) => updateLineItem(i, "type", e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      {LINE_ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          removeLineItem(i);
                          setInventorySearches((prev) => { const n = { ...prev }; delete n[i]; return n; });
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {inventoryItems.length > 0 && item.type === "FRAME" && (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            value={search}
                            onChange={(e) => setInventorySearches((prev) => ({ ...prev, [i]: e.target.value }))}
                            placeholder="Search inventory..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                          />
                        </div>
                        {search && (
                          <div className="border border-gray-100 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                            {filtered.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-4">No items match.</p>
                            ) : (
                              filtered.map((inv) => {
                                const desc = `${inv.brand} ${inv.model}${inv.color ? ` — ${inv.color}` : ""}`;
                                return (
                                  <button
                                    key={inv.id}
                                    type="button"
                                    onClick={() => {
                                      updateLineItem(i, "description", desc);
                                      updateLineItem(i, "type", "FRAME");
                                      updateLineItem(i, "unitPriceCustomer", inv.retailPrice ?? 0);
                                      updateLineItem(i, "unitPriceReal", isDualInvoice ? (inv.wholesaleCost ?? 0) : (inv.retailPrice ?? 0));
                                      setInventorySearches((prev) => ({ ...prev, [i]: "" }));
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm border-b border-gray-50 last:border-0 text-left hover:bg-gray-50"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium text-gray-900">{inv.brand} {inv.model}</span>
                                      {inv.color && <span className="text-gray-400 text-xs ml-1.5">{inv.color}</span>}
                                    </div>
                                    {inv.retailPrice && (
                                      <span className="text-xs font-semibold text-gray-700">{formatCurrency(inv.retailPrice)}</span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <input
                      value={item.description}
                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                          type="number" min="1"
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
                          type="number" min="0" step="0.01"
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
                            type="number" min="0" step="0.01"
                            value={item.unitPriceReal || ""}
                            onChange={(e) => updateLineItem(i, "unitPriceReal", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-right text-gray-500">
                      Subtotal: <span className="font-medium text-gray-900">{formatCurrency(item.unitPriceCustomer * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={addLineItem} className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm text-primary border border-dashed border-primary/40 hover:bg-primary/5 font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Add item
          </button>

          <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold">
            <span className="text-gray-700">Subtotal</span>
            <span className="text-gray-900">{formatCurrency(lineTotal)}</span>
          </div>
        </div>
      )}

      {/* ── STEP: Payment ── */}
      {step === stepN("Payment") && (
        <div className="space-y-4">
          {/* Deductions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Payment</h2>

            <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(lineTotal)}</span>
              </div>
              {insuranceCoverage > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Insurance Coverage</span>
                  <span>−{formatCurrency(insuranceCoverage)}</span>
                </div>
              )}
              {referralCredit > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Referral / Promo Credit</span>
                  <span>−{formatCurrency(referralCredit)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Insurance Coverage ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={insuranceCoverage || ""}
                  onChange={(e) => setInsuranceCoverage(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Referral / Promo Credit ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={referralCredit || ""}
                  onChange={(e) => setReferralCredit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {isDualInvoice ? "Deposit (Customer)" : "Deposit"}
                </label>
                <input
                  type="number" min="0" step="0.01" max={totalCustomer}
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deposit (Internal)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={depositReal || ""}
                    onChange={(e) => setDepositReal(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {depositCustomer > 0 && (
              <div className="flex justify-between text-sm font-semibold text-primary bg-primary/5 rounded-lg px-4 py-2">
                <span>Balance Due</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>
      )}

      {/* ── STEP: Review & Complete ── */}
      {step === maxStep && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Order Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-medium">{selectedCustomer?.lastName}, {selectedCustomer?.firstName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium capitalize">{orderCategory.replace(/_/g, " ")}</dd>
              </div>
              {lensType && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Lens</dt>
                  <dd className="font-medium capitalize">{lensType.replace("_", " ")} {lensDesign && `— ${lensDesign}`}</dd>
                </div>
              )}
              {frameBrand && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Frame</dt>
                  <dd className="font-medium">{frameBrand} {frameModel}</dd>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{formatCurrency(totalCustomer)}</dd>
              </div>
              {depositCustomer > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <dt>Deposit</dt>
                    <dd>−{formatCurrency(depositCustomer)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold text-primary">
                    <dt>Balance Due</dt>
                    <dd>{formatCurrency(balanceDue)}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* Invoice options */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Invoice Actions</h2>
            <p className="text-xs text-gray-500">Select what to do after creating this order.</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={printInvoice} onChange={(e) => setPrintInvoice(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <Printer className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">Print Invoice</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={emailInvoice} onChange={(e) => setEmailInvoice(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">Email Invoice to Customer</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={printWorkOrder} onChange={(e) => setPrintWorkOrder(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <Printer className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">Print Work Order</span>
                <span className="text-xs text-primary font-medium ml-auto">Recommended</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Order Created!</h2>
                <p className="text-sm text-gray-500 mt-1">Order #{createdOrder.orderNumber}</p>
                {emailInvoice && (
                  <p className="text-xs text-green-600 mt-1">Invoice email sent to customer</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/orders/${createdOrder.id}`)}
                className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                View Order
              </button>
              {selectedCustomer && (
                <button
                  onClick={resetForAnotherOrder}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  Add Another Order for {selectedCustomer.firstName}
                </button>
              )}
              <button
                onClick={() => router.push("/orders/board")}
                className="w-full text-gray-400 py-2 text-sm hover:text-gray-600 transition-colors"
              >
                Back to Orders Board
              </button>
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

        {step < maxStep ? (
          <button
            type="button"
            onClick={handleNext}
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
