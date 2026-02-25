import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Svg,
  Path,
  Circle,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  total: number;
};

export type InvoicePdfData = {
  orderNumber: string;
  invoiceNumber: string;
  date: string;
  mode: "customer" | "internal";
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  };
  staffName: string;
  lineItems: InvoicePdfLineItem[];
  subtotal: number;
  insuranceCoverage: number;
  referralCredit: number;
  deposit: number;
  total: number;
  notes: string | null;
};

// ─── Business Constants ─────────────────────────────────────────────────────

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
  "Payment due at time of purchase unless otherwise stated. Prescription lenses and other custom orders are final sale once ordered and cannot be cancelled or refunded once processing has begun. Our 30-day frame guarantee applies to frames only and is valid for returns or exchanges when the frame is in good, resellable condition (original condition; not worn or damaged, with all original components). Our 2-year lens guarantee covers coating failures due to manufacturing defects and does not cover scratches, damage, misuse, accidental breakage, or normal wear and tear. Where insurance/benefits are applied, coverage amounts are estimates based on available information and the patient is responsible for remaining balance.";

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    fontSize: 8,
    color: "#555",
    lineHeight: 1.5,
  },
  headerLeftLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#333",
    marginBottom: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  brandText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    letterSpacing: 1,
    color: "#111",
  },
  invoiceTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: "#222",
    letterSpacing: 2,
  },
  internalBanner: {
    backgroundColor: "#fffbeb",
    border: "1pt solid #fbbf24",
    borderRadius: 4,
    padding: "6 10",
    marginBottom: 12,
  },
  internalBannerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#92400e",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  billToBox: {
    border: "1pt solid #ccc",
    borderRadius: 3,
    flexDirection: "row",
    padding: 12,
    marginBottom: 16,
  },
  billToLeft: {
    flex: 1,
  },
  billToLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  billToName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#111",
    marginBottom: 2,
  },
  billToAddress: {
    fontSize: 8,
    color: "#888",
  },
  billToEmail: {
    fontSize: 7,
    color: "#aaa",
    marginTop: 2,
  },
  billToRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  invoiceNum: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#444",
  },
  invoiceDate: {
    fontSize: 9,
    color: "#888",
    marginTop: 2,
  },
  internalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#d97706",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderTop: "1pt solid #ccc",
    borderLeft: "1pt solid #ccc",
    borderRight: "1pt solid #ccc",
  },
  tableRow: {
    flexDirection: "row",
    borderLeft: "1pt solid #ccc",
    borderRight: "1pt solid #ccc",
    borderBottom: "1pt solid #ccc",
  },
  tableRowPad: {
    flexDirection: "row",
    borderLeft: "1pt solid #ccc",
    borderRight: "1pt solid #ccc",
    borderBottom: "1pt solid #ccc",
    minHeight: 24,
  },
  thDesc: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: "8 10",
    flex: 1,
  },
  thPrice: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: "8 10",
    width: 100,
    textAlign: "right",
  },
  tdDesc: {
    fontSize: 9,
    color: "#333",
    padding: "8 10",
    flex: 1,
  },
  tdPrice: {
    fontSize: 9,
    color: "#333",
    padding: "8 10",
    width: 100,
    textAlign: "right",
  },
  // Notes + Totals row
  notesTotals: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  notesCol: {
    flex: 1,
  },
  notesLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  notesBox: {
    border: "1pt solid #ccc",
    borderRadius: 3,
    padding: 8,
    minHeight: 80,
    fontSize: 8,
    color: "#555",
  },
  totalsCol: {
    flex: 1,
  },
  totalsRow: {
    flexDirection: "row",
    borderLeft: "1pt solid #ccc",
    borderRight: "1pt solid #ccc",
    borderBottom: "1pt solid #ccc",
  },
  totalsRowFirst: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderTop: "1pt solid #ccc",
    borderLeft: "1pt solid #ccc",
    borderRight: "1pt solid #ccc",
    borderBottom: "1pt solid #ccc",
  },
  totalsRowFinal: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderLeft: "1pt solid #ccc",
    borderRight: "1pt solid #ccc",
    borderBottom: "1pt solid #ccc",
  },
  totalsLabel: {
    flex: 1,
    fontSize: 9,
    color: "#555",
    padding: "6 8",
  },
  totalsLabelBold: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: "8 8",
  },
  totalsLabelFinal: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#111",
    padding: "8 8",
  },
  totalsValue: {
    fontSize: 9,
    color: "#333",
    padding: "6 8",
    width: 80,
    textAlign: "right",
  },
  totalsValueBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#111",
    padding: "8 8",
    width: 80,
    textAlign: "right",
  },
  totalsValueFinal: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#111",
    padding: "8 8",
    width: 80,
    textAlign: "right",
  },
  internalNote: {
    flexDirection: "row",
    borderLeft: "1pt solid #ccc",
    borderRight: "1pt solid #ccc",
    borderBottom: "1pt solid #ccc",
  },
  internalNoteText: {
    fontSize: 7,
    color: "#aaa",
    padding: "4 8",
    flex: 1,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 16,
  },
  footerAuth: {
    fontSize: 9,
  },
  footerAuthLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#444",
  },
  footerAuthName: {
    fontSize: 9,
    color: "#555",
    marginTop: 2,
  },
  footerLicense: {
    fontSize: 7,
    color: "#888",
    marginTop: 2,
  },
  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerLogoText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: "#111",
  },
  // Terms
  termsBox: {
    borderTop: "1pt solid #eee",
    paddingTop: 10,
    marginTop: 12,
  },
  termsLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#888",
  },
  termsText: {
    fontSize: 6,
    color: "#aaa",
    lineHeight: 1.5,
    marginTop: 2,
  },
});

// ─── Eye Icon SVG ───────────────────────────────────────────────────────────

function EyeIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
        stroke="#111"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle
        cx={12}
        cy={12}
        r={3}
        stroke="#111"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ─── Invoice Document ───────────────────────────────────────────────────────

function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const isInternal = data.mode === "internal";
  const customerAddress = [
    data.customer.address,
    data.customer.city,
    data.customer.province,
    data.customer.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const padRows = Math.max(0, 5 - data.lineItems.length);

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Internal banner */}
        {isInternal && (
          <View style={s.internalBanner}>
            <Text style={s.internalBannerText}>
              INTERNAL COPY — For staff use only. Do not share with patient.
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerLeftLabel}>Located At:</Text>
            <Text>{BUSINESS.address}</Text>
            <Text>{BUSINESS.city} · {BUSINESS.postalCode}</Text>
            <Text>{BUSINESS.website}</Text>
            <Text>{BUSINESS.email}</Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.brandRow}>
              <Text style={s.brandText}>MINTVISION</Text>
              <EyeIcon size={18} />
            </View>
            <Text style={s.invoiceTitle}>
              {isInternal ? "INTERNAL" : "INVOICE"}
            </Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={s.billToBox}>
          <View style={s.billToLeft}>
            <Text style={s.billToLabel}>Bill To:</Text>
            <Text style={s.billToName}>
              {data.customer.firstName} {data.customer.lastName}
            </Text>
            {customerAddress ? (
              <Text style={s.billToAddress}>{customerAddress}</Text>
            ) : null}
            {data.customer.email && !isInternal ? (
              <Text style={s.billToEmail}>{data.customer.email}</Text>
            ) : null}
          </View>
          <View style={s.billToRight}>
            <Text style={s.invoiceNum}>Invoice # {data.invoiceNumber}</Text>
            <Text style={s.invoiceDate}>Date: {data.date}</Text>
            {isInternal && (
              <Text style={s.internalLabel}>Internal Copy</Text>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={s.tableHeader}>
          <Text style={s.thDesc}>Item Description</Text>
          <Text style={s.thPrice}>
            {isInternal ? "Price (Real)" : "Price ($)"}
          </Text>
        </View>
        {data.lineItems.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.tdDesc}>{item.description}</Text>
            <Text style={s.tdPrice}>{fmt(item.total)}</Text>
          </View>
        ))}
        {Array.from({ length: padRows }).map((_, i) => (
          <View key={`pad-${i}`} style={s.tableRowPad}>
            <Text style={s.tdDesc}> </Text>
            <Text style={s.tdPrice}> </Text>
          </View>
        ))}

        {/* Notes + Totals */}
        <View style={s.notesTotals}>
          <View style={s.notesCol}>
            <Text style={s.notesLabel}>Notes</Text>
            <View style={s.notesBox}>
              <Text>{data.notes ?? ""}</Text>
            </View>
          </View>
          <View style={s.totalsCol}>
            {/* SUBTOTAL */}
            <View style={s.totalsRowFirst}>
              <Text style={s.totalsLabelBold}>Subtotal</Text>
              <Text style={s.totalsValueBold}>{fmt(data.subtotal)}</Text>
            </View>
            {/* Insurance */}
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Insurance Coverage</Text>
              <Text style={s.totalsValue}>-{fmt(data.insuranceCoverage)}</Text>
            </View>
            {/* Referral */}
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Referral/Promo</Text>
              <Text style={s.totalsValue}>-{fmt(data.referralCredit)}</Text>
            </View>
            {/* Deposit */}
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Deposit</Text>
              <Text style={s.totalsValue}>-{fmt(data.deposit)}</Text>
            </View>
            {/* Total */}
            <View style={s.totalsRowFinal}>
              <Text style={s.totalsLabelFinal}>Total</Text>
              <Text style={s.totalsValueFinal}>{fmt(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View>
            <Text style={s.footerAuthLabel}>Authorized by</Text>
            <Text style={s.footerAuthName}>{data.staffName}, RO</Text>
            <Text style={s.footerLicense}>License: {BUSINESS.license}</Text>
          </View>
          <View style={s.footerLogo}>
            <Text style={s.footerLogoText}>MINT</Text>
            <EyeIcon size={22} />
            <Text style={s.footerLogoText}>VISION</Text>
          </View>
        </View>

        {/* Terms */}
        {!isInternal && (
          <View style={s.termsBox}>
            <Text style={s.termsLabel}>Terms:</Text>
            <Text style={s.termsText}>{TERMS}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function generateInvoicePdf(
  data: InvoicePdfData
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <InvoiceDocument data={data} />
  );
  return Buffer.from(buffer);
}
