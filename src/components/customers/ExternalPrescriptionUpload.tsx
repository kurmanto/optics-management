"use client";

import { useRef, useState } from "react";
import { transcribePrescriptionImage, addExternalPrescription } from "@/lib/actions/orders";
import { Upload, Wand2, Check, AlertCircle, Camera } from "lucide-react";

type RxValues = {
  odSphere: string;
  odCylinder: string;
  odAxis: string;
  odAdd: string;
  osSphere: string;
  osCylinder: string;
  osAxis: string;
  osAdd: string;
  pdDistance: string;
  pdNear: string;
};

type Props = {
  customerId: string;
  onSaved?: () => void;
};

export function ExternalPrescriptionUpload({ customerId, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");

  const [doctorName, setDoctorName] = useState("");
  const [doctorLicense, setDoctorLicense] = useState("");
  const [rxDate, setRxDate] = useState("");
  const [notes, setNotes] = useState("");

  const [rxValues, setRxValues] = useState<RxValues>({
    odSphere: "", odCylinder: "", odAxis: "", odAdd: "",
    osSphere: "", osCylinder: "", osAxis: "", osAdd: "",
    pdDistance: "", pdNear: "",
  });

  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasTranscribed, setHasTranscribed] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      // Strip data URL prefix to get base64
      const base64 = result.split(",")[1];
      setImageBase64(base64);
      setHasTranscribed(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleTranscribe() {
    if (!imageBase64) return;
    setTranscribing(true);
    setError("");

    const result = await transcribePrescriptionImage(imageBase64, imageMime);

    if ("error" in result) {
      setError(result.error);
      setTranscribing(false);
      return;
    }

    const d = result.data;
    setDoctorName(d.doctorName || "");
    setDoctorLicense(d.doctorLicense || "");
    setRxDate(d.date || "");
    setNotes(d.notes || "");
    setRxValues({
      odSphere: d.OD.sphere || "",
      odCylinder: d.OD.cylinder || "",
      odAxis: d.OD.axis || "",
      odAdd: d.OD.add || "",
      osSphere: d.OS.sphere || "",
      osCylinder: d.OS.cylinder || "",
      osAxis: d.OS.axis || "",
      osAdd: d.OS.add || "",
      pdDistance: d.PD.distance || "",
      pdNear: d.PD.near || "",
    });

    setHasTranscribed(true);
    setTranscribing(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const result = await addExternalPrescription({
      customerId,
      doctorName: doctorName || undefined,
      doctorLicense: doctorLicense || undefined,
      rxDate: rxDate || undefined,
      notes: notes || undefined,
      odSphere: rxValues.odSphere ? parseFloat(rxValues.odSphere) : undefined,
      odCylinder: rxValues.odCylinder ? parseFloat(rxValues.odCylinder) : undefined,
      odAxis: rxValues.odAxis ? parseInt(rxValues.odAxis) : undefined,
      odAdd: rxValues.odAdd ? parseFloat(rxValues.odAdd) : undefined,
      osSphere: rxValues.osSphere ? parseFloat(rxValues.osSphere) : undefined,
      osCylinder: rxValues.osCylinder ? parseFloat(rxValues.osCylinder) : undefined,
      osAxis: rxValues.osAxis ? parseInt(rxValues.osAxis) : undefined,
      osAdd: rxValues.osAdd ? parseFloat(rxValues.osAdd) : undefined,
      pdBinocular: rxValues.pdDistance ? parseFloat(rxValues.pdDistance) : undefined,
    });

    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    onSaved?.();
  }

  return (
    <div className="space-y-4">
      {/* Photo upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!imagePreview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Upload prescription image</p>
            <p className="text-xs text-gray-400 mt-1">Take a photo or choose from camera roll</p>
          </div>
        ) : (
          <div className="relative">
            <img src={imagePreview} alt="Prescription" className="w-full rounded-xl object-contain max-h-64 bg-gray-50" />
            <button
              onClick={() => { setImagePreview(null); setImageBase64(null); setHasTranscribed(false); }}
              className="absolute top-2 right-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Transcribe button */}
      {imageBase64 && !hasTranscribed && (
        <button
          onClick={handleTranscribe}
          disabled={transcribing}
          className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Wand2 className="w-4 h-4" />
          {transcribing ? "Transcribing with AI..." : "Transcribe with AI"}
        </button>
      )}

      {hasTranscribed && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          AI transcription complete — review and edit values below
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Doctor info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Doctor Name</label>
          <input
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="Dr. Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">License #</label>
          <input
            value={doctorLicense}
            onChange={(e) => setDoctorLicense(e.target.value)}
            placeholder="License number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Rx Date</label>
          <input
            type="date"
            value={rxDate}
            onChange={(e) => setRxDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Prescription values table */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Prescription Values</h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Eye</th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-500">SPH</th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-500">CYL</th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-500">AXIS</th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-500">ADD</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 font-semibold text-gray-700 text-xs">OD (R)</td>
                {(["odSphere", "odCylinder", "odAxis", "odAdd"] as const).map((field) => (
                  <td key={field} className="px-1 py-1">
                    <input
                      value={rxValues[field]}
                      onChange={(e) => setRxValues((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder="—"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </td>
                ))}
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 font-semibold text-gray-700 text-xs">OS (L)</td>
                {(["osSphere", "osCylinder", "osAxis", "osAdd"] as const).map((field) => (
                  <td key={field} className="px-1 py-1">
                    <input
                      value={rxValues[field]}
                      onChange={(e) => setRxValues((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder="—"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-3 py-2 flex gap-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">PD Distance:</label>
              <input
                value={rxValues.pdDistance}
                onChange={(e) => setRxValues((prev) => ({ ...prev, pdDistance: e.target.value }))}
                placeholder="—"
                className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">PD Near:</label>
              <input
                value={rxValues.pdNear}
                onChange={(e) => setRxValues((prev) => ({ ...prev, pdNear: e.target.value }))}
                placeholder="—"
                className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      {saved ? (
        <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
          <Check className="w-4 h-4" />
          Prescription saved successfully
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Confirm & Save Prescription"}
        </button>
      )}
    </div>
  );
}
