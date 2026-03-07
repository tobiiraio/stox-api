import { baseEmailLayout } from "./base.template.js";
import type { EmailTemplate } from "./types.js";

export type OtpTemplateInput = {
  code: string;
  ttlMinutes: number;
  shopName?: string;
  purpose?: "login" | "verification";
};

export function otpEmailTemplate(input: OtpTemplateInput): EmailTemplate {
  const purpose = input.purpose ?? "login";

  const title =
    purpose === "verification" ? "Your verification code" : "Your login code";

  const subject =
    purpose === "verification"
      ? "Stox verification code"
      : "Stox login code";

  const actionText =
    purpose === "verification"
      ? "Use the code below to verify your email and complete setup."
      : "Use the code below to sign in.";

  const ignoreText =
    purpose === "verification"
      ? "If you did not start this signup, you can ignore this email."
      : "If you did not request this login, you can ignore this email.";

  const preheader = `Your Stox code is ${input.code}`;

  const shopLine = input.shopName
    ? `<p style="margin:0 0 10px 0;font-size:13px;color:#374151;">
         Shop: <b>${input.shopName}</b>
       </p>`
    : "";

  const bodyHtml = `
    ${shopLine}

    <p style="margin:0 0 14px 0;font-size:14px;color:#111827;">
      ${actionText} It expires in <b>${input.ttlMinutes} minutes</b>.
    </p>

    <div style="margin:16px 0 18px 0;">
      <div style="display:inline-block;padding:14px 18px;border:1px solid #e5e7eb;border-radius:10px;background:#ffffff;">
        <span style="font-size:28px;letter-spacing:6px;font-weight:700;">${input.code}</span>
      </div>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280;">
      ${ignoreText}
    </p>
  `;

  return {
    subject,
    html: baseEmailLayout({
      title,
      preheader,
      bodyHtml,
      footerNote: ignoreText
    }),
    text:
      purpose === "verification"
        ? `Your Stox verification code is ${input.code}. It expires in ${input.ttlMinutes} minutes.`
        : `Your Stox login code is ${input.code}. It expires in ${input.ttlMinutes} minutes.`
  };
}