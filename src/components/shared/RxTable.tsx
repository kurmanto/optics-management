import { formatRxValue } from "@/lib/utils/formatters";

export interface RxData {
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
  [key: string]: unknown;
}

export function RxTable({ rx }: { rx: RxData }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase">
            <th className="text-left pb-1.5">Eye</th>
            <th className="text-center pb-1.5">Sph</th>
            <th className="text-center pb-1.5">Cyl</th>
            <th className="text-center pb-1.5">Axis</th>
            <th className="text-center pb-1.5">Add</th>
            <th className="text-center pb-1.5">PD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 font-medium text-gray-700">OD (R)</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.odSphere)}</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.odCylinder)}</td>
            <td className="text-center py-1 font-mono">{rx.odAxis ?? "—"}</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.odAdd)}</td>
            <td className="text-center py-1 font-mono">{rx.odPd ?? "—"}</td>
          </tr>
          <tr>
            <td className="py-1 font-medium text-gray-700">OS (L)</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.osSphere)}</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.osCylinder)}</td>
            <td className="text-center py-1 font-mono">{rx.osAxis ?? "—"}</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.osAdd)}</td>
            <td className="text-center py-1 font-mono">{rx.osPd ?? "—"}</td>
          </tr>
        </tbody>
      </table>
      {rx.pdBinocular && (
        <p className="mt-1 text-xs text-gray-500">
          Binocular PD: <span className="font-medium text-gray-900">{rx.pdBinocular}</span>
        </p>
      )}
    </div>
  );
}
