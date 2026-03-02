import { baseEmailLayout } from "./base.template.js";
import type { EmailTemplate } from "./types.js";

export type StaffAddedTemplateInput = {
  shopName: string;
  shopId: string;
  invitedEmail: string;
};

function escape(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function staffAddedEmailTemplate(input: StaffAddedTemplateInput): EmailTemplate {
  const shopName = escape(input.shopName);
  const shopId = escape(input.shopId);
  const invitedEmail = escape(input.invitedEmail);

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:14px;color:#111827;">
      You have been added to <b>${shopName}</b> on Stox.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:10px 12px;background:#f9fafb;font-size:13px;color:#374151;width:160px;">Shop name</td>
        <td style="padding:10px 12px;font-size:13px;color:#111827;"><b>${shopName}</b></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f9fafb;font-size:13px;color:#374151;">Shop ID</td>
        <td style="padding:10px 12px;font-size:13px;color:#111827;"><code>${shopId}</code></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f9fafb;font-size:13px;color:#374151;">Account</td>
        <td style="padding:10px 12px;font-size:13px;color:#111827;"><b>${invitedEmail}</b></td>
      </tr>
    </table>

    <p style="margin:14px 0 0 0;font-size:13px;color:#6b7280;">
      Sign in using OTP with your Shop ID.
    </p>
  `;

  return {
    subject: `You were added to ${input.shopName}`,
    html: baseEmailLayout({
      title: "You were added to a shop",
      preheader: `You were added to ${input.shopName}`,
      bodyHtml
    }),
    text: `You were added to ${input.shopName}. Shop ID: ${input.shopId}. Sign in using OTP.`
  };
}