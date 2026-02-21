import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@mintvisionsoptique.com";

interface InvoiceEmailInput {
  to: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPriceCustomer: number;
    totalCustomer: number;
  }>;
  depositAmount?: number;
  balanceAmount?: number;
  insuranceCoverage?: number;
  referralCredit?: number;
  businessInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

export async function sendInvoiceEmail(input: InvoiceEmailInput) {
  const business = input.businessInfo ?? {
    name: "Mint Vision Optique",
    address: "1 Example Street, Toronto, ON M5V 3A8",
    phone: "(416) 555-0100",
    email: "info@mintvisionsoptique.com",
  };

  const lineItemRows = input.lineItems
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatCurrency(item.unitPriceCustomer)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatCurrency(item.totalCustomer)}</td>
        </tr>`
    )
    .join("");

  const deductionRows = [
    input.insuranceCoverage && input.insuranceCoverage > 0
      ? `<tr>
          <td colspan="3" style="padding:6px 12px;color:#059669;">Insurance Coverage</td>
          <td style="padding:6px 12px;color:#059669;text-align:right;">−${formatCurrency(input.insuranceCoverage)}</td>
        </tr>`
      : "",
    input.referralCredit && input.referralCredit > 0
      ? `<tr>
          <td colspan="3" style="padding:6px 12px;color:#059669;">Referral / Promo Credit</td>
          <td style="padding:6px 12px;color:#059669;text-align:right;">−${formatCurrency(input.referralCredit)}</td>
        </tr>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f8f8f8;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:0 0 24px;">
    <!-- Header -->
    <div style="background:#1a1a2e;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:2px;">MINT VISION OPTIQUE</h1>
      <p style="color:#aaa;margin:4px 0 0;font-size:12px;">${business.address}</p>
    </div>

    <!-- Invoice title -->
    <div style="padding:24px 40px 0;">
      <h2 style="margin:0 0 4px;font-size:18px;color:#111;">Invoice</h2>
      <p style="color:#666;font-size:13px;margin:0;">Order ${input.orderNumber}</p>
      <p style="color:#666;font-size:13px;margin:4px 0 0;">Date: ${new Date().toLocaleDateString("en-CA")}</p>
    </div>

    <!-- Customer info -->
    <div style="padding:16px 40px;">
      <p style="margin:0;font-size:13px;color:#555;">Bill To:</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#111;">${input.customerName}</p>
    </div>

    <!-- Line items -->
    <div style="padding:0 40px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#333;">Description</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#333;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#333;">Unit Price</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#333;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemRows}
          ${deductionRows}
          <tr style="background:#f9f9f9;">
            <td colspan="3" style="padding:10px 12px;font-weight:bold;font-size:15px;">Total</td>
            <td style="padding:10px 12px;font-weight:bold;font-size:15px;text-align:right;">${formatCurrency(input.totalAmount)}</td>
          </tr>
          ${
            input.depositAmount && input.depositAmount > 0
              ? `<tr>
                  <td colspan="3" style="padding:8px 12px;color:#555;">Deposit Paid</td>
                  <td style="padding:8px 12px;text-align:right;color:#555;">−${formatCurrency(input.depositAmount)}</td>
                </tr>
                <tr style="background:#fffbeb;">
                  <td colspan="3" style="padding:10px 12px;font-weight:bold;color:#d97706;">Balance Due</td>
                  <td style="padding:10px 12px;font-weight:bold;color:#d97706;text-align:right;">${formatCurrency(input.balanceAmount ?? 0)}</td>
                </tr>`
              : ""
          }
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:24px 40px 0;border-top:1px solid #eee;margin-top:24px;">
      <p style="font-size:11px;color:#999;margin:0;">
        Thank you for choosing ${business.name}.<br/>
        30-day frame guarantee · 2-year lens warranty on manufacturing defects.<br/>
        Custom orders are final sale. Insurance coverage subject to individual plan terms.
      </p>
      <p style="font-size:11px;color:#999;margin:8px 0 0;">
        ${business.phone} · ${business.email}
      </p>
    </div>
  </div>
</body>
</html>`;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.to,
    subject: `Your Invoice — Order ${input.orderNumber} | Mint Vision Optique`,
    html,
  });

  return result;
}
