"use client";

import { Printer } from "lucide-react";

type WorkOrderProps = {
  orderNumber: string;
  createdAt: Date;
  dueDate: Date | null;
  customer: { firstName: string; lastName: string; phone: string | null };
  frameBrand: string | null;
  frameModel: string | null;
  frameColor: string | null;
  frameColourCode: string | null;
  frameEyeSize: string | null;
  frameBridge: string | null;
  frameTemple: string | null;
  frameSku: string | null;
  frameWholesale: number | null;
  lensType: string | null;
  lensDesign: string | null;
  lensAddOns: string[];
  lensCoating: string | null;
  labNotes: string | null;
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
  } | null;
};

function rx(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
}

function deg(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return String(val) + "°";
}

export function WorkOrderView(props: WorkOrderProps) {
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
      <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-6 print:border-none print:rounded-none print:shadow-none print:p-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">WORK ORDER</h1>
            <p className="text-sm text-gray-500 mt-0.5">Mint Vision Optique</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{props.orderNumber}</p>
            <p className="text-xs text-gray-500">
              {new Date(props.createdAt).toLocaleDateString("en-CA")}
            </p>
            {props.dueDate && (
              <p className="text-xs font-semibold text-orange-600 mt-0.5">
                Due: {new Date(props.dueDate).toLocaleDateString("en-CA")}
              </p>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Patient</h2>
            <p className="font-semibold text-gray-900">{props.customer.lastName}, {props.customer.firstName}</p>
            {props.customer.phone && (
              <p className="text-sm text-gray-500">{props.customer.phone}</p>
            )}
          </div>
        </div>

        {/* Frame Specs */}
        {(props.frameBrand || props.frameModel) && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Frame</h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Spec label="Brand" value={props.frameBrand} />
              <Spec label="Model" value={props.frameModel} />
              <Spec label="Colour" value={props.frameColor} />
              <Spec label="Colour Code" value={props.frameColourCode} />
              <Spec label="Eye Size" value={props.frameEyeSize} />
              <Spec label="Bridge" value={props.frameBridge} />
              <Spec label="Temple" value={props.frameTemple} />
              <Spec label="SKU" value={props.frameSku} />
              <Spec label="Wholesale" value={props.frameWholesale !== null ? `$${props.frameWholesale?.toFixed(2)}` : null} />
            </div>
          </div>
        )}

        {/* Lens Specs */}
        {(props.lensType || props.lensDesign || props.lensAddOns?.length > 0) && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Lenses</h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Spec label="Type" value={props.lensType?.replace("_", " ")} />
              <Spec label="Design" value={props.lensDesign} />
              <Spec label="Coating" value={props.lensCoating} />
            </div>
            {props.lensAddOns?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Add-Ons:</p>
                <div className="flex flex-wrap gap-1.5">
                  {props.lensAddOns.map((addon) => (
                    <span key={addon} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                      {addon.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prescription */}
        {props.prescription && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Prescription
              {props.prescription.doctorName && (
                <span className="ml-2 normal-case font-normal text-gray-400">
                  — Dr. {props.prescription.doctorName}
                </span>
              )}
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 text-left">Eye</th>
                  <th className="border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Sphere</th>
                  <th className="border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Cylinder</th>
                  <th className="border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Axis</th>
                  <th className="border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Add</th>
                  <th className="border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 text-center">PD</th>
                  <th className="border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Seg Ht</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">OD (R)</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{rx(props.prescription.odSphere)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{rx(props.prescription.odCylinder)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{deg(props.prescription.odAxis)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{rx(props.prescription.odAdd)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{props.prescription.odPd ?? "—"}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{props.prescription.odSegmentHeight ?? "—"}</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">OS (L)</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{rx(props.prescription.osSphere)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{rx(props.prescription.osCylinder)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{deg(props.prescription.osAxis)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{rx(props.prescription.osAdd)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{props.prescription.osPd ?? "—"}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">{props.prescription.osSegmentHeight ?? "—"}</td>
                </tr>
              </tbody>
            </table>
            {props.prescription.pdBinocular && (
              <p className="text-xs text-gray-500 mt-1.5">Binocular PD: {props.prescription.pdBinocular}</p>
            )}
          </div>
        )}

        {/* Lab Notes */}
        {props.labNotes && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lab Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              {props.labNotes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-400">
          <span>Mint Vision Optique — Staff Portal</span>
          <span>Printed {new Date().toLocaleDateString("en-CA")}</span>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:border-none, .print\\:border-none * { visibility: visible; }
          .print\\:border-none { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}
