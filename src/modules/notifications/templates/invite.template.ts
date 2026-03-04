import { baseEmailLayout } from "./base.template.js";
import type { EmailTemplate } from "./types.js";

export type InviteTemplateInput = {
  shopName: string;
  invitedByEmail: string;
  inviteUrl: string;
};

function escape(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function inviteEmailTemplate(input: InviteTemplateInput): EmailTemplate {
  const shopName = escape(input.shopName);
  const invitedByEmail = escape(input.invitedByEmail);

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:14px;">
      You have been invited to join <b>${shopName}</b> on Stox by <b>${invitedByEmail}</b>.
    </p>

    <div style="margin:18px 0;">
      <a href="${input.inviteUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px;">
        Accept invite
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#6b7280;">
      If the button does not work, copy and paste this link:<br/>
      <span>${escape(input.inviteUrl)}</span>
    </p>
  `;

  const html = baseEmailLayout({
    title: "You have been invited",
    preheader: `Invite to join ${shopName} on Stox`,
    bodyHtml
  });

  return {
    subject: `Invitation to join ${shopName} on Stox`,
    html,
    text: `You were invited to join ${shopName} on Stox by ${invitedByEmail}. Open: ${input.inviteUrl}`
  };
}