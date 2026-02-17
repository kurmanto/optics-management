"use client";

import { useActionState, useRef, useState } from "react";
import { InventoryFormState } from "@/lib/actions/inventory";
import { InventoryItem } from "@prisma/client";
import { Upload, X } from "lucide-react";
import Image from "next/image";

type VendorOption = { id: string; name: string };

type Props = {
  action: (state: InventoryFormState, formData: FormData) => Promise<InventoryFormState>;
  item?: InventoryItem;
  vendors?: VendorOption[];
};

const CATEGORIES = [
  { value: "OPTICAL", label: "Optical" },
  { value: "SUN", label: "Sun" },
  { value: "READING", label: "Reading" },
  { value: "SAFETY", label: "Safety" },
  { value: "SPORT", label: "Sport" },
];

const GENDERS = [
  { value: "MENS", label: "Men's" },
  { value: "WOMENS", label: "Women's" },
  { value: "UNISEX", label: "Unisex" },
  { value: "KIDS", label: "Kids" },
];

const RIM_TYPES = [
  { value: "FULL_RIM", label: "Full Rim" },
  { value: "HALF_RIM", label: "Half Rim" },
  { value: "RIMLESS", label: "Rimless" },
];

const STYLE_TAGS = [
  "classic", "modern", "bold", "minimal", "sport", "luxury",
];

export function InventoryForm({ action, item, vendors = [] }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(item?.imageUrl || null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function clearPhoto() {
    setPreview(item?.imageUrl || null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const err = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}

      {/* Photo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Photo</h2>
        <div className="flex items-start gap-5">
          <div className="relative w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-1 right-1 w-5 h-5 bg-gray-900/60 rounded-full flex items-center justify-center text-white hover:bg-gray-900/80 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="text-center text-gray-400">
                <Upload className="w-6 h-6 mx-auto mb-1" />
                <span className="text-xs">No photo</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="photo-upload"
              className="inline-flex items-center gap-2 cursor-pointer h-8 px-3 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {preview ? "Change photo" : "Upload photo"}
            </label>
            <input
              id="photo-upload"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="sr-only"
            />
            <p className="text-xs text-gray-400">JPEG, PNG or WebP · max 5 MB</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Basic Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand <span className="text-red-500">*</span>
            </label>
            <input
              name="brand"
              defaultValue={item?.brand || ""}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Ray-Ban"
            />
            {err("brand") && <p className="text-red-500 text-xs mt-1">{err("brand")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model <span className="text-red-500">*</span>
            </label>
            <input
              name="model"
              defaultValue={item?.model || ""}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. RB5154"
            />
            {err("model") && <p className="text-red-500 text-xs mt-1">{err("model")}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              name="sku"
              defaultValue={item?.sku || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. RB-5154-BK"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              defaultValue={item?.category || "OPTICAL"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              defaultValue={item?.gender || "UNISEX"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UPC / Barcode</label>
            <input
              name="upc"
              defaultValue={(item as any)?.upc || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. 012345678901"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Color Code</label>
            <input
              name="colorCode"
              defaultValue={(item as any)?.colorCode || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. 901"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
            <input
              name="countryOfOrigin"
              defaultValue={(item as any)?.countryOfOrigin || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Italy"
            />
          </div>
        </div>

        {vendors.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              name="vendorId"
              defaultValue={(item as any)?.vendorId || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">— No vendor —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Style Tags</label>
          <div className="flex flex-wrap gap-3">
            {STYLE_TAGS.map((tag) => {
              const checked = ((item as any)?.styleTags ?? []).includes(tag);
              return (
                <label key={tag} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="styleTags"
                    value={tag}
                    defaultChecked={checked}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 capitalize">{tag}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Frame Specs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Frame Specifications</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              name="color"
              defaultValue={item?.color || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Matte Black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <input
              name="material"
              defaultValue={item?.material || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Acetate, Metal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rim Type</label>
            <select
              name="rimType"
              defaultValue={item?.rimType || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">—</option>
              {RIM_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
            <input
              name="size"
              defaultValue={item?.size || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="54-18-145"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eye (mm)</label>
            <input
              name="eyeSize"
              type="number"
              defaultValue={item?.eyeSize ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="54"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bridge (mm)</label>
            <input
              name="bridgeSize"
              type="number"
              defaultValue={item?.bridgeSize ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="18"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temple (mm)</label>
            <input
              name="templeLength"
              type="number"
              defaultValue={item?.templeLength ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="145"
            />
          </div>
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Pricing & Stock</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Cost</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                name="wholesaleCost"
                type="number"
                min="0"
                step="0.01"
                defaultValue={item?.wholesaleCost ?? ""}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Retail Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                name="retailPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={item?.retailPrice ?? ""}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
            <input
              name="stockQuantity"
              type="number"
              min="0"
              defaultValue={item?.stockQuantity ?? 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
            <input
              name="reorderPoint"
              type="number"
              min="0"
              defaultValue={item?.reorderPoint ?? 2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea
          name="notes"
          defaultValue={item?.notes || ""}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          placeholder="Any additional notes about this frame..."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <a
          href={item ? `/inventory/${item.id}` : "/inventory"}
          className="inline-flex items-center h-9 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-150"
        >
          {isPending ? "Saving..." : item ? "Save Changes" : "Add to Inventory"}
        </button>
      </div>
    </form>
  );
}
