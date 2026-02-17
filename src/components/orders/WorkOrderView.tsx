"use client";

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
  const frameTitle = [props.frameBrand, props.frameModel, props.frameColor]
    .filter(Boolean)
    .join(" ");

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
        className="bg-white border border-gray-200 rounded-xl p-8 space-y-6 print:border-none print:rounded-none print:shadow-none print:p-4"
      >
        {/* Header — centered, like screenshot */}
        <div className="text-center border-b border-gray-300 pb-5">
          <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
            MINTVISION WORK ORDER
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            257 Dundas St. W, Oakville, ON &nbsp;|&nbsp; harmeet@mintvision.ca &nbsp;|&nbsp; 905-257-6400
          </p>
        </div>

        {/* Customer Name + Frame — large, centered */}
        <div className="text-center space-y-2 border-b border-gray-200 pb-5">
          <p className="text-2xl font-bold text-gray-900">
            {props.customer.firstName} {props.customer.lastName}
          </p>
          {frameTitle && (
            <p className="text-lg font-semibold text-gray-700">{frameTitle}</p>
          )}
          {props.dueDate && (
            <p className="text-sm font-semibold text-orange-600 mt-1">
              Due: {new Date(props.dueDate).toLocaleDateString("en-CA")}
            </p>
          )}
        </div>

        {/* Order # + Email boxes */}
        <div className="space-y-2">
          <div className="border border-gray-400 rounded px-4 py-2">
            <span className="font-bold text-sm text-gray-800">Order #: </span>
            <span className="text-sm text-gray-700">{props.orderNumber}</span>
            <span className="text-xs text-gray-400 ml-3">
              {new Date(props.createdAt).toLocaleDateString("en-CA")}
            </span>
          </div>
          {props.customer.email && (
            <div className="border border-gray-400 rounded px-4 py-2">
              <span className="font-bold text-sm text-gray-800">Email: </span>
              <span className="text-sm text-gray-700">{props.customer.email}</span>
            </div>
          )}
          {props.customer.phone && (
            <div className="border border-gray-400 rounded px-4 py-2">
              <span className="font-bold text-sm text-gray-800">Phone: </span>
              <span className="text-sm text-gray-700">{props.customer.phone}</span>
            </div>
          )}
        </div>

        {/* Prescription */}
        {props.prescription && (
          <div>
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
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
                  <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 text-left">Eye</th>
                  <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Sphere</th>
                  <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Cylinder</th>
                  <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Axis</th>
                  <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Add</th>
                  <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 text-center">PD</th>
                  <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 text-center">Seg Ht</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-700">OD (Right)</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{rx(props.prescription.odSphere)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{rx(props.prescription.odCylinder)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{deg(props.prescription.odAxis)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{rx(props.prescription.odAdd)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{props.prescription.odPd ?? "—"}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{props.prescription.odSegmentHeight ?? "—"}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-700">OS (Left)</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{rx(props.prescription.osSphere)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{rx(props.prescription.osCylinder)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{deg(props.prescription.osAxis)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{rx(props.prescription.osAdd)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{props.prescription.osPd ?? "—"}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-mono">{props.prescription.osSegmentHeight ?? "—"}</td>
                </tr>
              </tbody>
            </table>
            {props.prescription.pdBinocular && (
              <p className="text-xs text-gray-500 mt-1.5">Binocular PD: {props.prescription.pdBinocular}</p>
            )}
          </div>
        )}

        {/* Frame Specifications */}
        {(props.frameBrand || props.frameModel) && (
          <div>
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Frame Specifications</h2>
            <div className="grid grid-cols-2 gap-0 border border-gray-300 rounded overflow-hidden text-sm">
              <SpecRow label="Brand" value={props.frameBrand} />
              <SpecRow label="Model" value={props.frameModel} />
              <SpecRow label="Colour" value={props.frameColor} />
              <SpecRow label="Colour Code" value={props.frameColourCode} />
              <SpecRow label="Eye Size" value={props.frameEyeSize} />
              <SpecRow label="Bridge" value={props.frameBridge} />
              <SpecRow label="Temple" value={props.frameTemple} />
              <SpecRow label="SKU" value={props.frameSku} />
            </div>
          </div>
        )}

        {/* Lens Specs */}
        {(props.lensType || props.lensDesign || props.lensAddOns?.length > 0) && (
          <div>
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Lens Specifications</h2>
            <div className="grid grid-cols-2 gap-0 border border-gray-300 rounded overflow-hidden text-sm">
              <SpecRow label="Type" value={props.lensType?.replace("_", " ")} />
              <SpecRow label="Design" value={props.lensDesign} />
              <SpecRow label="Coating" value={props.lensCoating} />
            </div>
            {props.lensAddOns?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1.5">Add-Ons:</p>
                <div className="flex flex-wrap gap-1.5">
                  {props.lensAddOns.map((addon) => (
                    <span key={addon} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium border border-gray-200">
                      {addon.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lab Notes */}
        {props.labNotes && (
          <div>
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Lab Notes</h2>
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
          #work-order-doc, #work-order-doc * { visibility: visible; }
          #work-order-doc { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <>
      <div className="bg-gray-50 border-b border-r border-gray-300 px-3 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="border-b border-gray-300 px-3 py-2 text-gray-800">
        {value}
      </div>
    </>
  );
}
