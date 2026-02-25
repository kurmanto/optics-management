import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@mintvisionsoptique.com";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// ─── Invoice Email (simplified — PDF attachment) ──────────────────────────

interface InvoiceEmailInput {
  to: string;
  customerName: string;
  orderNumber: string;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmail(input: InvoiceEmailInput) {
  const firstName = input.customerName.split(" ")[0] || "there";
  const invNum = input.orderNumber.split("-").pop()?.padStart(4, "0") ?? "0000";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f8f8f8;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:0 0 24px;">
    <!-- Header -->
    <div style="background:#1a1a2e;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:2px;">MINT VISION OPTIQUE</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Dear ${firstName},
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Thank you for choosing MintVision! Your invoice for Order ${input.orderNumber} is attached to this email as a PDF.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
        If you have any questions about your order or invoice, please don't hesitate to reach out.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0;">
        Warm regards,<br/>
        <strong>Mint Vision Optique</strong><br/>
        <span style="font-size:12px;color:#888;">905-257-6400 · harmeet@mintvision.ca</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 40px 0;border-top:1px solid #eee;">
      <p style="font-size:11px;color:#999;margin:0;">
        478 Dundas St. W. Unit 5, Oakville, Ontario L6H 6L8<br/>
        30-day frame guarantee · 2-year lens warranty on manufacturing defects.
      </p>
    </div>
  </div>
</body>
</html>`;

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: input.to,
    subject: `Your Invoice — Order ${input.orderNumber} | Mint Vision Optique`,
    html,
    attachments: [
      {
        filename: `MintVision-Invoice-${invNum}.pdf`,
        content: input.pdfBuffer,
      },
    ],
  });

  return result;
}

// ─── Intake Email ──────────────────────────────────────────────────────────

interface IntakeEmailInput {
  to: string;
  customerName: string;
  intakeUrl: string;
}

export async function sendIntakeEmail(input: IntakeEmailInput) {
  const firstName = input.customerName.split(" ")[0] || "there";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f8f8f8;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:0 0 24px;">
    <!-- Header -->
    <div style="background:#1a1a2e;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:2px;">MINT VISION OPTIQUE</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111;">Your Intake Forms</h2>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hi ${firstName}, please complete your new patient intake forms before your visit.
        It takes about 3–5 minutes and no account is needed.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${input.intakeUrl}"
           style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
          Start Forms
        </a>
      </div>
      <p style="color:#999;font-size:12px;line-height:1.5;margin:24px 0 0;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${input.intakeUrl}" style="color:#16a34a;word-break:break-all;">${input.intakeUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 40px 0;border-top:1px solid #eee;">
      <p style="font-size:11px;color:#999;margin:0;">
        Thank you for choosing Mint Vision Optique.<br/>
        This link is unique to you — please do not share it.
      </p>
    </div>
  </div>
</body>
</html>`;

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: input.to,
    subject: "Your Intake Forms — Mint Vision Optique",
    html,
  });

  return result;
}
