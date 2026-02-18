"use client";

import { Eye, Printer, Mail } from "lucide-react";

// Business constants
const BUSINESS = {
  address: "478 Dundas St. W. Unit 5",
  city: "Oakville, Ontario",
  postalCode: "L6H 6L8",
  website: "www.mintvision.ca",
  email: "harmeet@mintvision.ca",
  phone: "905-257-6400",
  license: "C-4375",
};

const TERMS =
  "Payment due at time of purchase unless otherwise stated. Prescription lenses and other custom orders are final sale once ordered and cannot be cancelled or refunded once processing has begun. Our 30-day frame guarantee applies to frames only and is valid for returns or exchanges when the frame is in good, resalable condition (original condition; not worn or damaged, with all original components). Our 2-year lens guarantee covers coating failures due to manufacturing defects and does not cover scratches, damage, misuse, accidental breakage, or normal wear and tear. Where insurance/benefits are applied, coverage amounts are estimates based on available information and the patient is responsible for remaining balance.";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPriceCustomer: number;
  totalCustomer: number;
  unitPriceReal: number;
  totalReal: number;
};

export type InvoicePrescription = {
  doctorName: string | null;
  date: Date;
  source: string;
  // OD
  odSphere: number | null;
  odCylinder: number | null;
  odAxis: number | null;
  odAdd: number | null;
  odPd: number | null;
  // OS
  osSphere: number | null;
  osCylinder: number | null;
  osAxis: number | null;
  osAdd: number | null;
  osPd: number | null;
  // Combined
  pdBinocular: number | null;
};

export type InvoiceViewProps = {
  orderNumber: string;
  createdAt: Date;
  mode?: "customer" | "internal";
  isDualInvoice?: boolean;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  };
  user: { name: string };
  lineItems: InvoiceLineItem[];
  // Customer amounts
  totalCustomer: number;
  depositCustomer: number;
  balanceCustomer: number;
  // Real amounts
  totalReal: number;
  depositReal: number;
  balanceReal: number;
  insuranceCoverage: number | null;
  referralCredit: number | null;
  notes: string | null;
  prescription?: InvoicePrescription | null;
};

function invoiceNumber(orderNumber: string): string {
  const parts = orderNumber.split("-");
  const last = parts[parts.length - 1];
  return last.padStart(4, "0");
}

function fmt(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function rxVal(v: number | null | undefined): string {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

function rxAxis(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v}°`;
}

export function InvoiceView(props: InvoiceViewProps) {
  const mode = props.mode ?? "customer";
  const isInternal = mode === "internal";

  const invNum = invoiceNumber(props.orderNumber);
  const insurance = props.insuranceCoverage ?? 0;
  const referral = props.referralCredit ?? 0;

  // Pick amounts by mode
  const total = isInternal ? props.totalReal : props.totalCustomer;
  const deposit = isInternal ? props.depositReal : props.depositCustomer;
  const balance = isInternal ? props.balanceReal : props.balanceCustomer;

  const customerAddress = [
    props.customer.address,
    props.customer.city,
    props.customer.province,
    props.customer.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const emailSubject = `MintVision Invoice #${invNum}`;
  const emailBody = `Dear ${props.customer.firstName},\n\nThank you for choosing MintVision! Please find your invoice attached.\n\nIf you have any questions, please contact us at ${BUSINESS.email}\nor call us at ${BUSINESS.phone}.\n\nBest regards,\nThe MintVision Team`;
  const mailtoHref = props.customer.email
    ? `mailto:${props.customer.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : null;

  const rx = props.prescription;
  const hasRx = !!rx;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Action buttons — hidden when printing */}
      <div className="print:hidden flex justify-end mb-4 gap-2">
        {!isInternal && mailtoHref && (
          <a
            href={mailtoHref}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email to Customer
          </a>
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print {isInternal ? "Internal Copy" : "Invoice"}
        </button>
      </div>

      {/* Invoice Document */}
      <div
        id="invoice-doc"
        className="bg-white border border-gray-200 rounded-xl p-10 space-y-6 print:border-none print:rounded-none print:shadow-none print:p-6"
      >
        {/* Internal copy watermark banner */}
        {isInternal && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2 flex items-center gap-2 print:block">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              INTERNAL COPY — For staff use only. Do not share with patient.
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          {/* Located At */}
          <div className="text-xs text-gray-600 leading-relaxed">
            <p className="font-semibold text-gray-800 mb-1">Located At:</p>
            <p>{BUSINESS.address}</p>
            <p>{BUSINESS.city} · {BUSINESS.postalCode}</p>
            <a href={`https://${BUSINESS.website}`} className="text-primary underline block">
              {BUSINESS.website}
            </a>
            <p>{BUSINESS.email}</p>
          </div>

          {/* Logo + INVOICE */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 mb-0.5">
              <p className="text-2xl font-black tracking-tight leading-none">
                <span className="text-gray-900">MINT</span>
                <span className="text-primary">VISION</span>
              </p>
              <Eye className="w-7 h-7 text-primary flex-shrink-0" />
            </div>
            <p className="text-3xl font-black text-gray-800 tracking-wide">
              {isInternal ? "INTERNAL" : "INVOICE"}
            </p>
          </div>
        </div>

        {/* Bill To */}
        <div className="border border-gray-300 rounded">
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Bill To:</p>
              <p className="text-xl font-bold text-gray-900">
                {props.customer.firstName} {props.customer.lastName}
              </p>
              {customerAddress && (
                <p className="text-sm text-gray-500 mt-1">{customerAddress}</p>
              )}
              {props.customer.email && !isInternal && (
                <p className="text-xs text-gray-400 mt-0.5">{props.customer.email}</p>
              )}
            </div>
            <div className="text-right self-center">
              <p className="text-sm font-semibold text-gray-700">Invoice # {invNum}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Date: {new Date(props.createdAt).toLocaleDateString("en-CA")}
              </p>
              {isInternal && (
                <p className="text-xs text-amber-600 font-semibold mt-1 uppercase tracking-wide">
                  Internal Copy
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Prescription — shown when linked */}
        {hasRx && (
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Prescription
            </p>
            <div className="border border-gray-300 rounded overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700" />
                    <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700">Sphere</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700">Cyl</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700">Axis</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700">Add</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700">PD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-700 bg-gray-50">OD (R)</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxVal(rx.odSphere)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxVal(rx.odCylinder)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxAxis(rx.odAxis)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxVal(rx.odAdd)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxVal(rx.odPd)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-700 bg-gray-50">OS (L)</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxVal(rx.osSphere)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxVal(rx.osCylinder)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxAxis(rx.osAxis)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxVal(rx.osAdd)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rxVal(rx.osPd)}</td>
                  </tr>
                  {rx.pdBinocular != null && (
                    <tr>
                      <td colSpan={4} className="border border-gray-300 px-3 py-2 text-gray-500 text-xs" />
                      <td className="border border-gray-300 px-3 py-2 text-xs text-gray-500 text-center">Bino PD</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-gray-800">{rx.pdBinocular}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="px-3 py-2 text-xs text-gray-500 flex justify-between">
                <span>
                  {rx.source === "EXTERNAL" ? "External Rx" : "In-Office Exam"}
                  {rx.doctorName ? ` · ${rx.doctorName}` : ""}
                </span>
                <span>{new Date(rx.date).toLocaleDateString("en-CA")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Line Items */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                Item Description
              </th>
              <th className="border border-gray-300 px-4 py-2.5 text-right text-xs font-bold text-gray-700 uppercase tracking-wide w-32">
                {isInternal ? "Price (Real)" : "Price ($)"}
              </th>
            </tr>
          </thead>
          <tbody>
            {props.lineItems.map((item, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-4 py-3 text-gray-800">{item.description}</td>
                <td className="border border-gray-300 px-4 py-3 text-right text-gray-800">
                  {isInternal ? fmt(item.totalReal) : fmt(item.totalCustomer)}
                </td>
              </tr>
            ))}
            {/* Padding rows to fill space */}
            {Array.from({ length: Math.max(0, 5 - props.lineItems.length) }).map((_, i) => (
              <tr key={`pad-${i}`}>
                <td className="border border-gray-300 px-4 py-4">&nbsp;</td>
                <td className="border border-gray-300 px-4 py-4">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes + Totals */}
        <div className="grid grid-cols-2 gap-4">
          {/* Notes */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Notes</p>
            <div className="border border-gray-300 p-3 min-h-[120px] text-sm text-gray-600 rounded">
              {props.notes ?? ""}
            </div>
          </div>

          {/* Totals */}
          <div>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="bg-gray-100">
                  <td className="border border-gray-300 px-3 py-2.5 font-bold text-gray-700 uppercase text-xs tracking-wide">
                    Subtotal
                  </td>
                  <td className="border border-gray-300 px-3 py-2.5 text-right font-bold text-gray-900">
                    {fmt(total)}
                  </td>
                </tr>
                {!isInternal && insurance > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">Insurance Coverage</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-gray-800">
                      -{fmt(insurance)}
                    </td>
                  </tr>
                )}
                {!isInternal && referral > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">Referral/Promo</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-gray-800">
                      -{fmt(referral)}
                    </td>
                  </tr>
                )}
                {isInternal && (
                  <>
                    {insurance > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-gray-600">Insurance (billed)</td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-800">
                          -{fmt(insurance)}
                        </td>
                      </tr>
                    )}
                    {referral > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-gray-600">Referral/Promo</td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-800">
                          -{fmt(referral)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="border border-gray-300 px-3 py-2 text-xs text-gray-400">
                        Customer sees: {fmt(props.totalCustomer)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-xs text-gray-400">
                        dep: {fmt(props.depositCustomer)}
                      </td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="border border-gray-300 px-3 py-2 text-gray-600">Deposit</td>
                  <td className="border border-gray-300 px-3 py-2 text-right text-gray-800">
                    {fmt(deposit)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2.5 font-bold text-gray-900">Balance</td>
                  <td className="border border-gray-300 px-3 py-2.5 text-right font-bold text-gray-900">
                    {fmt(balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer — Authorized by + Logo */}
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-sm font-semibold text-gray-700">Authorized by</p>
            <p className="text-sm text-gray-600">{props.user.name}, RO</p>
            <p className="text-xs text-gray-500 mt-0.5">License: {BUSINESS.license}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <p className="text-xl font-black leading-tight">
                <span className="text-gray-900">MINT</span>
              </p>
              <p className="text-xl font-black leading-tight text-primary">VISION</p>
            </div>
            <Eye className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Terms — only on customer invoice */}
        {!isInternal && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-gray-500">Terms:</strong> {TERMS}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-doc, #invoice-doc * { visibility: visible; }
          #invoice-doc { position: absolute; left: 0; top: 0; width: 100%; padding: 1.5rem; }
          .print\\:hidden { display: none !important; }
          a { text-decoration: none; }
        }
      `}</style>
    </div>
  );
}
