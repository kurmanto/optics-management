"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

type WorkOrderProps = {
  orderNumber: string;
  createdAt: Date;
  dueDate: Date | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  frameBrand: string | null;
  frameModel: string | null;
  frameColor: string | null;
  frameColourCode: string | null;
  frameEyeSize: string | null;
  frameBridge: string | null;
  frameTemple: string | null;
  frameSku: string | null;
  frameWholesale: number | null;
  frameSource: string | null;
  frameStatus: string | null;
  frameConditionNotes: string | null;
  lensType: string | null;
  lensDesign: string | null;
  lensAddOns: string[];
  lensCoating: string | null;
  lensBrand: string | null;
  lensProductName: string | null;
  lensMaterial: string | null;
  lensTint: string | null;
  lensEdgeType: string | null;
  labNotes: string | null;
  notes: string | null;
  labOrderedAt: Date | null;
  labReceivedAt: Date | null;
  qcCheckedAt: Date | null;
  readyAt: Date | null;
  pickedUpAt: Date | null;
  preparedBy: string | null;
  verifiedBy: string | null;
  autoprint?: boolean;
  prescription: {
    date: Date;
    odSphere: number | null;
    odCylinder: number | null;
    odAxis: number | null;
    odAdd: number | null;
    odPd: number | null;
    osSphere: number | null;
    osCylinder: number | null;
    osAxis: number | null;
    osAdd: number | null;
    osPd: number | null;
    pdBinocular: number | null;
    doctorName: string | null;
    odSegmentHeight: number | null;
    osSegmentHeight: number | null;
    nearPd: number | null;
  } | null;
};

// ─── Label maps ──────────────────────────────────────────────────────────────

const FRAME_SOURCE_LABELS: Record<string, string> = {
  from_inventory: "From Inventory",
  patient_supplied: "Patient Supplied",
  to_be_ordered: "To Be Ordered",
};

const FRAME_STATUS_LABELS: Record<string, string> = {
  in_stock: "In Stock",
  ordered: "Ordered",
  patients_own: "Patient's Own Frame",
};

const MATERIAL_LABELS: Record<string, string> = {
  cr39: "CR39",
  polycarbonate: "Polycarbonate",
  "1.67_hi_index": "1.67 Hi-Index",
  trivex: "Trivex",
  "1.74_hi_index": "1.74 Hi-Index",
};

const EDGE_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  polish: "Polish",
  groove: "Groove",
  drill_mount: "Drill Mount",
};

const ADDON_LABELS: Record<string, string> = {
  crizal_blue_light: "Crizal Prevencia",
  max_clarity: "Crizal Sapphire",
  lens_thinning_basic: "Lens Thinning Basic 1.6",
  lens_thinning_signature: "Lens Thinning Signature 1.67",
  lens_thinning_elite: "Lens Thinning Elite 1.74",
  blue_select: "BlueSelect",
  crizal_sun_protect: "Crizal SunProtect",
  transitions: "Transitions",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rx(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
}

function deg(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return String(val) + "°";
}

function fmtDate(date: Date | null): string {
  if (!date) return "______";
  return new Date(date).toLocaleDateString("en-CA");
}

/** Infer material from lens_thinning add-ons for old orders without lensMaterial */
function deriveMaterial(addOns: string[]): string | null {
  if (addOns.includes("lens_thinning_elite")) return "1.74 Hi-Index";
  if (addOns.includes("lens_thinning_signature")) return "1.67 Hi-Index";
  if (addOns.includes("lens_thinning_basic")) return "1.6 Mid-Index";
  return null;
}

/** Combine lensCoating + non-thinning add-ons into one string */
function deriveCoatings(lensCoating: string | null, addOns: string[]): string {
  const parts: string[] = [];
  if (lensCoating) parts.push(lensCoating);
  for (const addon of addOns) {
    if (addon.startsWith("lens_thinning")) continue;
    const label = ADDON_LABELS[addon] ?? addon.replace(/_/g, " ");
    parts.push(label);
  }
  return parts.join(", ") || "—";
}

function buildFrameSize(eye: string | null, bridge: string | null, temple: string | null): string | null {
  if (!eye && !bridge && !temple) return null;
  return [eye || "—", bridge || "—", temple || "—"].join("-");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkOrderView(props: WorkOrderProps) {
  const patientName = `${props.customer.firstName} ${props.customer.lastName}`;
  const orderDate = new Date(props.createdAt).toLocaleDateString("en-CA");

  useEffect(() => {
    if (props.autoprint) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [props.autoprint]);

  const materialDisplay =
    props.lensMaterial
      ? (MATERIAL_LABELS[props.lensMaterial] ?? props.lensMaterial)
      : deriveMaterial(props.lensAddOns);

  const coatingsDisplay = deriveCoatings(props.lensCoating, props.lensAddOns);
  const frameSize = buildFrameSize(props.frameEyeSize, props.frameBridge, props.frameTemple);

  // Near PD: use prescription nearPd field, fallback to pdBinocular for progressive/bifocal
  const nearPdDisplay =
    props.prescription?.nearPd ??
    (["progressive", "bifocal"].includes(props.lensType ?? "")
      ? props.prescription?.pdBinocular
      : null);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Print button — hidden when printing */}
      <div className="print:hidden flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Work Order
        </button>
      </div>

      {/* Work Order Document */}
      <div
        id="work-order-doc"
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 print:border-none print:rounded-none print:shadow-none print:p-4 text-sm"
      >
        {/* 1. Header */}
        <div className="border-b-2 border-black pb-3">
          <h1 className="text-lg font-bold text-black uppercase tracking-wide">
            WORK ORDER — {patientName} — {orderDate}
          </h1>
        </div>

        {/* 2. Order Meta */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="font-semibold text-gray-600 text-xs uppercase">Order #</span>
            <p className="font-bold text-black">{props.orderNumber}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-600 text-xs uppercase">Phone</span>
            <p className="text-black">{props.customer.phone || "—"}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-600 text-xs uppercase">Expected Ready</span>
            <p className="text-black">{props.dueDate ? fmtDate(props.dueDate) : "—"}</p>
          </div>
        </div>

        {/* 3. Prescription Table */}
        {props.prescription && (
          <div>
            <h2 className="text-xs font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
              Prescription
              {props.prescription.doctorName && (
                <span className="ml-2 normal-case font-normal text-gray-500">
                  — Dr. {props.prescription.doctorName}
                </span>
              )}
            </h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Eye</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-semibold">Sphere</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-semibold">Cylinder</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-semibold">Axis</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-semibold">Add</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-semibold">PD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-2 py-1.5 font-semibold">OD (Right)</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{rx(props.prescription.odSphere)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{rx(props.prescription.odCylinder)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{deg(props.prescription.odAxis)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{rx(props.prescription.odAdd)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{props.prescription.odPd ?? "—"}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-2 py-1.5 font-semibold">OS (Left)</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{rx(props.prescription.osSphere)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{rx(props.prescription.osCylinder)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{deg(props.prescription.osAxis)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{rx(props.prescription.osAdd)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-center font-mono">{props.prescription.osPd ?? "—"}</td>
                </tr>
              </tbody>
            </table>
            {nearPdDisplay && (
              <p className="text-xs text-gray-600 mt-1">Near PD: {nearPdDisplay}</p>
            )}
          </div>
        )}

        {/* 4. Frame Specifications */}
        {(props.frameBrand || props.frameModel) && (
          <div>
            <h2 className="text-xs font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
              Frame Specifications
            </h2>
            <div className="grid grid-cols-2 gap-0 border border-gray-400 text-xs">
              <SpecRow label="Brand" value={props.frameBrand} />
              <SpecRow label="Model" value={props.frameModel} />
              <SpecRow label="Colour" value={props.frameColor} />
              <SpecRow label="Frame Size" value={frameSize} />
              <SpecRow label="Frame Source" value={props.frameSource ? (FRAME_SOURCE_LABELS[props.frameSource] ?? props.frameSource) : null} />
              <SpecRow label="Frame Status" value={props.frameStatus ? (FRAME_STATUS_LABELS[props.frameStatus] ?? props.frameStatus) : null} />
              {props.frameSource === "patient_supplied" && props.frameConditionNotes && (
                <SpecRow label="Condition Notes" value={props.frameConditionNotes} fullWidth />
              )}
            </div>
          </div>
        )}

        {/* 5. Lens Specifications */}
        {(props.lensType || props.lensDesign || (props.lensAddOns?.length ?? 0) > 0 || props.lensBrand) && (
          <div>
            <h2 className="text-xs font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
              Lens Specifications
            </h2>
            <div className="grid grid-cols-2 gap-0 border border-gray-400 text-xs">
              <SpecRow label="Lens Type" value={props.lensType?.replace(/_/g, " ")} />
              <SpecRow label="Brand / Supplier" value={props.lensBrand} />
              <SpecRow label="Product Name" value={props.lensProductName} />
              <SpecRow label="Material" value={materialDisplay} />
              <SpecRow label="Coating / Treatment" value={coatingsDisplay !== "—" ? coatingsDisplay : null} />
              <SpecRow label="Tint" value={props.lensTint} />
              <SpecRow label="Edge Type" value={props.lensEdgeType ? (EDGE_TYPE_LABELS[props.lensEdgeType] ?? props.lensEdgeType) : null} />
              <SpecRow label="PD (L/R)" value={
                props.prescription?.odPd || props.prescription?.osPd
                  ? `${props.prescription.osPd ?? "—"} / ${props.prescription.odPd ?? "—"}`
                  : (props.prescription?.pdBinocular ? String(props.prescription.pdBinocular) : null)
              } />
              <SpecRow label="Seg Height (OD/OS)" value={
                props.prescription?.odSegmentHeight || props.prescription?.osSegmentHeight
                  ? `${props.prescription.odSegmentHeight ?? "—"} / ${props.prescription.osSegmentHeight ?? "—"}`
                  : null
              } />
            </div>
          </div>
        )}

        {/* 6. Lab Instructions / Notes */}
        {(props.labNotes || props.notes) && (
          <div>
            <h2 className="text-xs font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
              Lab Instructions / Notes
            </h2>
            <div className="border border-gray-400 rounded p-3 text-xs whitespace-pre-wrap text-black">
              {props.labNotes && <p>{props.labNotes}</p>}
              {props.labNotes && props.notes && <hr className="my-2 border-gray-300" />}
              {props.notes && <p className="text-gray-600">{props.notes}</p>}
            </div>
          </div>
        )}

        {/* 7. Order Status Checklist */}
        <div>
          <h2 className="text-xs font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
            Order Status Checklist
          </h2>
          <table className="w-full text-xs border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold w-8"></th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Status</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Date</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">By</th>
              </tr>
            </thead>
            <tbody>
              <ChecklistRow label="Sent to Lab" date={props.labOrderedAt} />
              <ChecklistRow label="Received from Lab" date={props.labReceivedAt} />
              <ChecklistRow label="QC Checked" date={props.qcCheckedAt} />
              <ChecklistRow label="Ready for Pickup" date={props.readyAt} by={props.preparedBy} />
              <ChecklistRow label="Dispensed" date={props.pickedUpAt} />
            </tbody>
          </table>
        </div>

        {/* 8. Footer */}
        <div className="border-t border-gray-300 pt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Mint Vision Optique</span>
          <span>Printed {new Date().toLocaleDateString("en-CA")}</span>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #work-order-doc, #work-order-doc * { visibility: visible; }
          #work-order-doc { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SpecRow({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
}) {
  if (!value) return null;
  if (fullWidth) {
    return (
      <>
        <div className="bg-gray-100 border-b border-r border-gray-400 px-2 py-1.5 font-semibold text-gray-700 uppercase tracking-wide col-span-2">
          {label}
        </div>
        <div className="border-b border-gray-400 px-2 py-1.5 text-black col-span-2">
          {value}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="bg-gray-100 border-b border-r border-gray-400 px-2 py-1.5 font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </div>
      <div className="border-b border-gray-400 px-2 py-1.5 text-black">
        {value}
      </div>
    </>
  );
}

function ChecklistRow({
  label,
  date,
  by,
}: {
  label: string;
  date: Date | null;
  by?: string | null;
}) {
  const filled = !!date;
  return (
    <tr>
      <td className="border border-gray-400 px-2 py-1.5 text-center">
        {filled ? "☑" : "☐"}
      </td>
      <td className="border border-gray-400 px-2 py-1.5 font-medium">{label}</td>
      <td className="border border-gray-400 px-2 py-1.5 font-mono">
        {filled ? new Date(date).toLocaleDateString("en-CA") : "______"}
      </td>
      <td className="border border-gray-400 px-2 py-1.5">
        {by ?? ""}
      </td>
    </tr>
  );
}
