import { baseEmailLayout } from "./base.template.js";
import type { EmailTemplate } from "./types.js";

export type NewOwnerShopTemplateInput = {
  ownerEmail: string;
  shopName: string;
  shopId: string;
  dashboardUrl?: string; // optional link to UI
};

function escape(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function newOwnerShopEmailTemplate(input: NewOwnerShopTemplateInput): EmailTemplate {
  const ownerEmail = escape(input.ownerEmail);
  const shopName = escape(input.shopName);
  const shopId = escape(input.shopId);

  const dashboardBlock = input.dashboardUrl
    ? `
      <div style="margin:18px 0;">
        <a href="${input.dashboardUrl}"
           style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px;">
          Open dashboard
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#6b7280;">
        If the button does not work, copy and paste this link:<br/>
        <span>${escape(input.dashboardUrl)}</span>
      </p>
    `
    : "";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:14px;color:#111827;">
      Your shop has been created and your owner account is ready.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:10px 12px;background:#f9fafb;font-size:13px;color:#374151;width:160px;">Owner</td>
        <td style="padding:10px 12px;font-size:13px;color:#111827;"><b>${ownerEmail}</b></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f9fafb;font-size:13px;color:#374151;">Shop name</td>
        <td style="padding:10px 12px;font-size:13px;color:#111827;"><b>${shopName}</b></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f9fafb;font-size:13px;color:#374151;">Shop ID</td>
        <td style="padding:10px 12px;font-size:13px;color:#111827;"><code>${shopId}</code></td>
      </tr>
    </table>

    <p style="margin:14px 0 0 0;font-size:13px;color:#6b7280;">
      Keep your Shop ID safe. You’ll use it to sign in and to connect your team.
    </p>

    ${dashboardBlock}
  `;

  return {
    subject: `Your shop is ready: ${shopName}`,
    html: baseEmailLayout({
      title: "Shop created",
      preheader: `Your shop ${shopName} is ready.`,
      bodyHtml,
      footerNote: "If you did not create this shop, contact support."
    }),
    text:
      `Shop created.\n` +
      `Owner: ${input.ownerEmail}\n` +
      `Shop name: ${input.shopName}\n` +
      `Shop ID: ${input.shopId}\n` +
      (input.dashboardUrl ? `Dashboard: ${input.dashboardUrl}\n` : "")
  };
}