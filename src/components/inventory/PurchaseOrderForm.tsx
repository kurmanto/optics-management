"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { POFormState, CreatePOInput } from "@/lib/actions/purchase-orders";
import { generateSku } from "@/lib/utils/sku";

type Vendor = { id: string; name: string };
type InventoryItemOption = {
  id: string;
  brand: string;
  model: string;
  sku: string | null;
  wholesaleCost: number | null;
  colorCode?: string | null;
  eyeSize?: string | null;
  bridge?: string | null;
};

type LineItemRow = {
  inventoryItemId?: string;
  quantityOrdered: number;
  unitCost: number;
  // Expanded fields
  brand?: string;
  model?: string;
  gender?: string;
  eyeSize?: string;
  bridge?: string;
  temple?: string;
  color?: string;
  colorCode?: string;
  retailPrice?: number;
  frameType?: string;
  material?: string;
  notes?: string;
  // Display label
  _label: string;
  _skuPreview?: string;
};

const GENDER_OPTIONS = ["UNISEX", "MALE", "FEMALE", "KIDS"] as const;
const FRAME_TYPE_OPTIONS = ["Optical", "Sunglasses", "Reading", "Safety", "Sport"] as const;
const MATERIAL_OPTIONS = ["Acetate", "Metal", "Titanium", "TR-90", "Stainless Steel", "Mixed", "Other"] as const;
const COLOR_OPTIONS = ["Black", "Tortoise", "Gold", "Silver", "Blue", "Brown", "Red", "Clear", "Gunmetal", "Rose Gold", "Other"] as const;

type Props = {
  vendors: Vendor[];
  inventoryItems: InventoryItemOption[];
  action: (input: CreatePOInput) => Promise<POFormState>;
};

function SkuPreview({ sku }: { sku: string }) {
  if (!sku) return null;
  return (
    <p className="text-xs text-primary font-mono mt-1">
      SKU Preview: <span className="font-semibold">{sku}</span>
    </p>
  );
}

export default function PurchaseOrderForm({ vendors, inventoryItems, action }: Props) {
  const router = useRouter();

  const [vendorId, setVendorId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [shipping, setShipping] = useState(0);
  const [duties, setDuties] = useState(0);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Mode: "existing" or "new"
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");

  // Existing item picker state
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addCost, setAddCost] = useState("");

  // New frame fields state
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newGender, setNewGender] = useState("UNISEX");
  const [newEyeSize, setNewEyeSize] = useState("");
  const [newBridge, setNewBridge] = useState("");
  const [newTemple, setNewTemple] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newColorCode, setNewColorCode] = useState("");
  const [newRetailPrice, setNewRetailPrice] = useState("");
  const [newFrameType, setNewFrameType] = useState("Optical");
  const [newMaterial, setNewMaterial] = useState("Acetate");
  const [newQty, setNewQty] = useState(1);
  const [newCost, setNewCost] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filteredItems = inventoryItems.filter((item) => {
    if (!itemSearch.trim()) return true;
    const q = itemSearch.toLowerCase();
    return (
      item.brand.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) ||
      (item.sku ?? "").toLowerCase().includes(q)
    );
  });

  const selectedItem = inventoryItems.find((i) => i.id === selectedItemId);

  function handleSelectItem(id: string) {
    setSelectedItemId(id);
    const item = inventoryItems.find((i) => i.id === id);
    if (item?.wholesaleCost != null) {
      setAddCost(String(item.wholesaleCost));
    } else {
      setAddCost("");
    }
  }

  function handleAddExistingLine() {
    if (!selectedItemId) return;
    if (addQty <= 0) return;
    const cost = parseFloat(addCost) || 0;
    const item = inventoryItems.find((i) => i.id === selectedItemId);
    const label = item
      ? `${item.brand} ${item.model}${item.sku ? ` (${item.sku})` : ""}`
      : selectedItemId;

    setLineItems((prev) => [
      ...prev,
      {
        inventoryItemId: selectedItemId,
        quantityOrdered: addQty,
        unitCost: cost,
        brand: item?.brand,
        model: item?.model,
        colorCode: item?.colorCode ?? undefined,
        eyeSize: item?.eyeSize ?? undefined,
        bridge: item?.bridge ?? undefined,
        _label: label,
      },
    ]);
    setSelectedItemId("");
    setItemSearch("");
    setAddQty(1);
    setAddCost("");
  }

  const newSkuPreview = generateSku({
    brand: newBrand,
    model: newModel,
    colorCode: newColorCode,
    eyeSize: newEyeSize,
    bridge: newBridge,
  });

  function handleAddNewLine() {
    if (!newBrand && !newModel) return;
    if (newQty <= 0) return;
    const cost = parseFloat(newCost) || 0;
    const retail = parseFloat(newRetailPrice) || undefined;
    const label = `${newBrand} ${newModel}`.trim() + (newColor ? ` — ${newColor}` : "");

    setLineItems((prev) => [
      ...prev,
      {
        quantityOrdered: newQty,
        unitCost: cost,
        brand: newBrand || undefined,
        model: newModel || undefined,
        gender: newGender || undefined,
        eyeSize: newEyeSize || undefined,
        bridge: newBridge || undefined,
        temple: newTemple || undefined,
        color: newColor || undefined,
        colorCode: newColorCode || undefined,
        retailPrice: retail,
        frameType: newFrameType || undefined,
        material: newMaterial || undefined,
        notes: newNotes || undefined,
        _label: label,
        _skuPreview: newSkuPreview || undefined,
      },
    ]);

    // Reset new frame fields
    setNewBrand("");
    setNewModel("");
    setNewGender("UNISEX");
    setNewEyeSize("");
    setNewBridge("");
    setNewTemple("");
    setNewColor("");
    setNewColorCode("");
    setNewRetailPrice("");
    setNewFrameType("Optical");
    setNewMaterial("Acetate");
    setNewQty(1);
    setNewCost("");
    setNewNotes("");
  }

  function handleRemoveLine(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantityOrdered * li.unitCost,
    0
  );
  const total = subtotal + shipping + duties;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vendorId) {
      setError("Please select a vendor.");
      return;
    }
    if (lineItems.length === 0) {
      setError("Please add at least one line item.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await action({
        vendorId,
        expectedAt: expectedAt || undefined,
        shipping,
        duties,
        notes: notes || undefined,
        lineItems: lineItems.map(({ _label, _skuPreview, ...rest }) => rest),
      });
      if (result?.error) {
        setError(result.error);
      }
      // On success, action redirects
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Vendor + Expected Date */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor <span className="text-red-500">*</span>
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select vendor...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Delivery Date
            </label>
            <input
              type="date"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setAddMode("existing")}
              className={`px-3 py-1.5 ${addMode === "existing" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              Select Existing
            </button>
            <button
              type="button"
              onClick={() => setAddMode("new")}
              className={`px-3 py-1.5 border-l border-gray-200 ${addMode === "new" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              Add New Frame
            </button>
          </div>
        </div>

        {/* Existing item picker */}
        {addMode === "existing" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Search & Select Item
              </label>
              <input
                type="text"
                placeholder="Search by brand, model, SKU..."
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setSelectedItemId("");
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-1"
              />
              {itemSearch && (
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
                  {filteredItems.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400">No items found</p>
                  ) : (
                    filteredItems.slice(0, 20).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectItem(item.id);
                          setItemSearch(`${item.brand} ${item.model}`);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          selectedItemId === item.id ? "bg-primary/10 font-medium" : ""
                        }`}
                      >
                        {item.brand} {item.model}
                        {item.sku && (
                          <span className="text-gray-400 ml-1">({item.sku})</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedItem && (
                <p className="text-xs text-primary mt-1">
                  Selected: {selectedItem.brand} {selectedItem.model}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
              <input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Unit Cost ($)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={addCost}
                  onChange={(e) => setAddCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddExistingLine}
                  disabled={!selectedItemId}
                  className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New frame form */}
        {addMode === "new" && (
          <div className="mb-4 pb-4 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="e.g. Ray-Ban"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model #</label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g. RB5154"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                <select
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Frame Type</label>
                <select
                  value={newFrameType}
                  onChange={(e) => setNewFrameType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {FRAME_TYPE_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Eye Size</label>
                <input
                  type="text"
                  value={newEyeSize}
                  onChange={(e) => setNewEyeSize(e.target.value)}
                  placeholder="e.g. 49"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bridge</label>
                <input
                  type="text"
                  value={newBridge}
                  onChange={(e) => setNewBridge(e.target.value)}
                  placeholder="e.g. 21"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Temple</label>
                <input
                  type="text"
                  value={newTemple}
                  onChange={(e) => setNewTemple(e.target.value)}
                  placeholder="e.g. 140"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                <select
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {MATERIAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Colour</label>
                <select
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select colour...</option>
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Colour Code</label>
                <input
                  type="text"
                  value={newColorCode}
                  onChange={(e) => setNewColorCode(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Retail Price ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newRetailPrice}
                  onChange={(e) => setNewRetailPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Gross profit display + SKU preview */}
            <div className="flex items-center gap-6">
              {newCost && newRetailPrice && (
                <p className="text-xs text-gray-600">
                  Gross Profit:{" "}
                  <span className={parseFloat(newRetailPrice) - parseFloat(newCost) >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    ${(parseFloat(newRetailPrice) - parseFloat(newCost)).toFixed(2)}
                  </span>
                </p>
              )}
              <SkuPreview sku={newSkuPreview} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={newQty}
                    onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewLine}
                    disabled={!newBrand && !newModel}
                    className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Line items table */}
        {lineItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4">Item</th>
                  <th className="pb-2 pr-4">Details</th>
                  <th className="pb-2 pr-4 text-right">Qty</th>
                  <th className="pb-2 pr-4 text-right">Unit Cost</th>
                  <th className="pb-2 pr-4 text-right">Line Total</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-800">{li._label}</p>
                      {li._skuPreview && (
                        <p className="text-xs text-gray-400 font-mono">{li._skuPreview}</p>
                      )}
                      {li.inventoryItemId && (
                        <p className="text-xs text-gray-400">Existing item</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">
                      {[li.frameType, li.material, li.eyeSize && `${li.eyeSize}/${li.bridge}`]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">{li.quantityOrdered}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">
                      ${li.unitCost.toFixed(2)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-gray-800">
                      ${(li.quantityOrdered * li.unitCost).toFixed(2)}
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-right text-sm font-semibold text-gray-700">
              Subtotal: ${subtotal.toFixed(2)}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            No items added yet. Use the picker above to add items.
          </p>
        )}
      </div>

      {/* Shipping, Duties, Total, Notes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Costs & Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipping ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={shipping}
              onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duties ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={duties}
              onChange={(e) => setDuties(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <div className="w-full bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">Order Total</p>
              <p className="text-xl font-bold text-gray-900">${total.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this order..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create Purchase Order"}
        </button>
      </div>
    </form>
  );
}
