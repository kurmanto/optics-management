"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2, Plus, Camera, Search, Calendar } from "lucide-react";
import { saveFrame, removeSavedFrame, toggleFavorite, updateExpectedReturnDate, uploadFramePhoto } from "@/lib/actions/saved-frames";
import { formatDate } from "@/lib/utils/formatters";

type SavedFrame = {
  id: string;
  brand: string;
  model: string | null;
  color: string | null;
  sku: string | null;
  photoUrl: string | null;
  notes: string | null;
  savedBy: string | null;
  isFavorite: boolean;
  expectedReturnDate: Date | null;
  createdAt: Date;
  inventoryItem: { id: string; brand: string; model: string } | null;
};

type InventoryItem = {
  id: string;
  brand: string;
  model: string;
  color: string | null;
  sku: string | null;
};

type Props = {
  customerId: string;
  initialFrames: SavedFrame[];
  inventoryItems?: InventoryItem[];
};

export function SavedFramesCard({ customerId, initialFrames, inventoryItems = [] }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [invSearch, setInvSearch] = useState("");
  const [selectedInvItem, setSelectedInvItem] = useState<InventoryItem | null>(null);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredInv = inventoryItems.filter((inv) =>
    invSearch.length === 0 ||
    `${inv.brand} ${inv.model} ${inv.color || ""} ${inv.sku || ""}`.toLowerCase().includes(invSearch.toLowerCase())
  ).slice(0, 8);

  function selectInvItem(inv: InventoryItem) {
    setSelectedInvItem(inv);
    setBrand(inv.brand);
    setModel(inv.model);
    setColor(inv.color || "");
    setInvSearch("");
    // Auto-populate photo if a SavedFrame for this inventory item already has one
    const existing = initialFrames.find(
      (f) => f.inventoryItem?.id === inv.id && f.photoUrl
    );
    if (existing?.photoUrl) setPhotoUrl(existing.photoUrl);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const result = await uploadFramePhoto(base64, file.type, customerId);
      if ("url" in result) setPhotoUrl(result.url);
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function handleAdd() {
    if (!brand) { setError("Brand is required"); return; }
    setError("");
    startTransition(async () => {
      const result = await saveFrame({
        customerId,
        inventoryItemId: selectedInvItem?.id,
        brand,
        model: model || undefined,
        color: color || undefined,
        notes: notes || undefined,
        photoUrl: photoUrl || undefined,
        expectedReturnDate: expectedDate || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setShowAddForm(false);
        setBrand(""); setModel(""); setColor(""); setNotes(""); setExpectedDate(""); setPhotoUrl(""); setSelectedInvItem(null);
        router.refresh();
      }
    });
  }

  function handleToggleFavorite(frameId: string) {
    startTransition(async () => {
      await toggleFavorite(frameId);
      router.refresh();
    });
  }

  function handleRemove(frameId: string) {
    if (!confirm("Remove this saved frame?")) return;
    startTransition(async () => {
      await removeSavedFrame(frameId);
      router.refresh();
    });
  }

  function startEditDate(frame: SavedFrame) {
    setEditingDateId(frame.id);
    setEditingDateValue(
      frame.expectedReturnDate
        ? new Date(frame.expectedReturnDate).toISOString().split("T")[0]
        : ""
    );
  }

  function handleSaveDate(frameId: string) {
    startTransition(async () => {
      await updateExpectedReturnDate(frameId, editingDateValue || null);
      setEditingDateId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {initialFrames.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-400 text-center py-4">No saved frames yet.</p>
      )}

      {/* Frame grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {initialFrames.map((frame) => (
          <div key={frame.id} className={`border rounded-xl overflow-hidden ${frame.isFavorite ? "border-primary/30 bg-primary/5" : "border-gray-200"}`}>
            {frame.photoUrl && (
              <img src={frame.photoUrl} alt={`${frame.brand} ${frame.model}`} className="w-full h-24 object-cover" />
            )}
            <div className="p-3 space-y-1.5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{frame.brand}</p>
                  {frame.model && <p className="text-xs text-gray-500 truncate">{frame.model}</p>}
                  {frame.color && <p className="text-xs text-gray-400">{frame.color}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button type="button" onClick={() => handleToggleFavorite(frame.id)}>
                    <Heart className={`w-4 h-4 ${frame.isFavorite ? "fill-red-500 text-red-500" : "text-gray-300"}`} />
                  </button>
                  <button type="button" aria-label="Remove frame" onClick={() => handleRemove(frame.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                  </button>
                </div>
              </div>

              {/* Expected return date — inline edit */}
              {editingDateId === frame.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    data-testid="frame-return-date-input"
                    value={editingDateValue}
                    onChange={(e) => setEditingDateValue(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveDate(frame.id)}
                    disabled={pending}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDateId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEditDate(frame)}
                  className="flex items-center gap-1 w-full text-left"
                >
                  {frame.expectedReturnDate ? (
                    <span className={`text-xs flex items-center gap-1 ${new Date(frame.expectedReturnDate) < new Date() ? "text-red-600" : "text-amber-600"}`}>
                      <Calendar className="w-3 h-3" />
                      Return by {formatDate(frame.expectedReturnDate)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 flex items-center gap-1 hover:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      Set return date
                    </span>
                  )}
                </button>
              )}

              {frame.notes && <p className="text-xs text-gray-400 italic truncate">{frame.notes}</p>}
              {frame.savedBy && <p className="text-xs text-gray-300">by {frame.savedBy}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm ? (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Save a Frame</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Inventory search */}
          {inventoryItems.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Search Inventory</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Search by brand/model..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {invSearch && filteredInv.length > 0 && (
                <div className="border border-gray-100 rounded-lg max-h-40 overflow-y-auto">
                  {filteredInv.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => selectInvItem(inv)}
                      className="w-full text-left px-3 py-2.5 text-sm border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <span className="font-medium">{inv.brand} {inv.model}</span>
                      {inv.color && <span className="text-gray-400 ml-2">{inv.color}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedInvItem && (
                <p className="text-xs text-primary">Selected: {selectedInvItem.brand} {selectedInvItem.model}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Brand *</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ray-Ban" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="RB5154" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Matte Black" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expected Return</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Customer likes the fit..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Photo</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <Camera className="w-4 h-4" />
                {photoUploading ? "Uploading..." : photoUrl ? "Change Photo" : "Take / Upload Photo"}
              </button>
              {photoUrl && <span className="text-xs text-green-600">✓ Photo uploaded</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            {brand && model && (
              <a
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${brand} ${model} eyeglasses`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
              >
                <Search className="w-3 h-3" /> Find image online
              </a>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
            <button type="button" onClick={handleAdd} disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {pending ? "Saving..." : "Save Frame"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
        >
          <Plus className="w-4 h-4" />
          Save a Frame
        </button>
      )}
    </div>
  );
}
