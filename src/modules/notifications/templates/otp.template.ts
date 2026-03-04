import { baseEmailLayout } from "./base.template.js";
import type { EmailTemplate } from "./types.js";

export type OtpTemplateInput = {
  code: string;
  ttlMinutes: number;
  shopName?: string;
};

export function otpEmailTemplate(input: OtpTemplateInput): EmailTemplate {
  const title = "Your login code";
  const preheader = `Your Stox code is ${input.code}`;

  const shopLine = input.shopName
    ? `<p style="margin:0 0 10px 0;font-size:13px;color:#374151;">
         Shop: <b>${input.shopName}</b>
       </p>`
    : "";

  const bodyHtml = `
    ${shopLine}

    <p style="margin:0 0 14px 0;font-size:14px;color:#111827;">
      Use the code below to sign in. It expires in <b>${input.ttlMinutes} minutes</b>.
    </p>

    <div style="margin:16px 0 18px 0;">
      <div style="display:inline-block;padding:14px 18px;border:1px solid #e5e7eb;border-radius:10px;background:#ffffff;">
        <span style="font-size:28px;letter-spacing:6px;font-weight:700;">${input.code}</span>
      </div>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">
      If you did not request this, you can ignore this email.
    </p>
  `;

  return {
    subject: "Stox login code",
    html: baseEmailLayout({
      title,
      preheader,
      bodyHtml,
      footerNote: "If you did not request a login code, you can ignore this email."
    }),
    text: `Your Stox login code is ${input.code}. It expires in ${input.ttlMinutes} minutes.`
  };
}