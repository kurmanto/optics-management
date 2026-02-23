"use client";

import { useRef, useState } from "react";
import { recordCurrentGlassesReading, uploadPrescriptionScanAction } from "@/lib/actions/orders";
import { Camera, Check } from "lucide-react";

type Props = {
  customerId: string;
};

export function CurrentGlassesForm({ customerId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [odSphere, setOdSphere] = useState("");
  const [odCylinder, setOdCylinder] = useState("");
  const [odAxis, setOdAxis] = useState("");
  const [odAdd, setOdAdd] = useState("");
  const [osSphere, setOsSphere] = useState("");
  const [osCylinder, setOsCylinder] = useState("");
  const [osAxis, setOsAxis] = useState("");
  const [osAdd, setOsAdd] = useState("");
  const [pdBinocular, setPdBinocular] = useState("");
  const [notes, setNotes] = useState("");

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    try {
      let imageUrl: string | undefined;

      // Upload photo if provided
      if (imageBase64) {
        const uploadResult = await uploadPrescriptionScanAction(imageBase64, imageMime, customerId);
        if ("error" in uploadResult) {
          setError(uploadResult.error);
          setSaving(false);
          return;
        }
        imageUrl = uploadResult.url;
      }

      const result = await recordCurrentGlassesReading({
        customerId,
        date,
        odSphere: odSphere ? parseFloat(odSphere) : undefined,
        odCylinder: odCylinder ? parseFloat(odCylinder) : undefined,
        odAxis: odAxis ? parseInt(odAxis) : undefined,
        odAdd: odAdd ? parseFloat(odAdd) : undefined,
        osSphere: osSphere ? parseFloat(osSphere) : undefined,
        osCylinder: osCylinder ? parseFloat(osCylinder) : undefined,
        osAxis: osAxis ? parseInt(osAxis) : undefined,
        osAdd: osAdd ? parseFloat(osAdd) : undefined,
        pdBinocular: pdBinocular ? parseFloat(pdBinocular) : undefined,
        notes: notes || undefined,
        imageUrl,
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        // Reset form
        setOdSphere(""); setOdCylinder(""); setOdAxis(""); setOdAdd("");
        setOsSphere(""); setOsCylinder(""); setOsAxis(""); setOsAdd("");
        setPdBinocular(""); setNotes("");
        setImagePreview(null); setImageBase64(null);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("An unexpected error occurred");
    }

    setSaving(false);
  }

  const inputCls = "w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="space-y-4">
      {/* Date */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Date of Reading</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* OD/OS Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase">
              <th className="text-left pb-2 pr-2 w-16">Eye</th>
              <th className="text-center pb-2 px-1">SPH</th>
              <th className="text-center pb-2 px-1">CYL</th>
              <th className="text-center pb-2 px-1">AXIS</th>
              <th className="text-center pb-2 px-1">ADD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1 pr-2 font-medium text-gray-700">OD (R)</td>
              <td className="py-1 px-1"><input value={odSphere} onChange={(e) => setOdSphere(e.target.value)} placeholder="±0.00" className={inputCls} /></td>
              <td className="py-1 px-1"><input value={odCylinder} onChange={(e) => setOdCylinder(e.target.value)} placeholder="±0.00" className={inputCls} /></td>
              <td className="py-1 px-1"><input value={odAxis} onChange={(e) => setOdAxis(e.target.value)} placeholder="0-180" className={inputCls} /></td>
              <td className="py-1 px-1"><input value={odAdd} onChange={(e) => setOdAdd(e.target.value)} placeholder="+0.00" className={inputCls} /></td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-medium text-gray-700">OS (L)</td>
              <td className="py-1 px-1"><input value={osSphere} onChange={(e) => setOsSphere(e.target.value)} placeholder="±0.00" className={inputCls} /></td>
              <td className="py-1 px-1"><input value={osCylinder} onChange={(e) => setOsCylinder(e.target.value)} placeholder="±0.00" className={inputCls} /></td>
              <td className="py-1 px-1"><input value={osAxis} onChange={(e) => setOsAxis(e.target.value)} placeholder="0-180" className={inputCls} /></td>
              <td className="py-1 px-1"><input value={osAdd} onChange={(e) => setOsAdd(e.target.value)} placeholder="+0.00" className={inputCls} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PD */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">PD (binocular)</label>
        <input
          value={pdBinocular}
          onChange={(e) => setPdBinocular(e.target.value)}
          placeholder="e.g. 63"
          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Optional Photo */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Lensometer Photo (optional)</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            {imagePreview ? "Change Photo" : "Take / Upload Photo"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          {imagePreview && (
            <img src={imagePreview} alt="Lensometer" className="w-12 h-12 object-cover rounded border" />
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. scratched lenses, old frame, patient complaints..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || saved}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved!
          </>
        ) : saving ? (
          "Saving..."
        ) : (
          "Save Reading"
        )}
      </button>
    </div>
  );
}
