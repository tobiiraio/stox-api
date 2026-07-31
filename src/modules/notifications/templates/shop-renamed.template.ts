import { baseEmailLayout } from "./base.template.js";
import type { EmailTemplate } from "./types.js";

export type ShopRenamedTemplateInput = {
  oldName: string;
  newName: string;
  changedByEmail: string;
};

export function shopRenamedEmailTemplate(input: ShopRenamedTemplateInput): EmailTemplate {
  const title = "Your shop has been renamed";
  const preheader = `Your shop was renamed from "${input.oldName}" to "${input.newName}"`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:14px;color:#111827;">
      Your shop name has been updated by <b>${input.changedByEmail}</b>.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 18px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:10px 14px;background:#f3f4f6;border-radius:8px 0 0 8px;font-size:13px;color:#6b7280;white-space:nowrap;">Previous name</td>
        <td style="padding:10px 14px;background:#f3f4f6;font-size:14px;color:#111827;font-weight:600;border-left:1px solid #e5e7eb;border-radius:0 8px 8px 0;">${input.oldName}</td>
      </tr>
      <tr><td colspan="2" style="height:6px;"></td></tr>
      <tr>
        <td style="padding:10px 14px;background:#ecfdf5;border-radius:8px 0 0 8px;font-size:13px;color:#065f46;white-space:nowrap;">New name</td>
        <td style="padding:10px 14px;background:#ecfdf5;font-size:14px;color:#065f46;font-weight:600;border-left:1px solid #a7f3d0;border-radius:0 8px 8px 0;">${input.newName}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#6b7280;">
      If you did not make this change, please contact your shop owner immediately.
    </p>
  `;

  return {
    subject: `Shop renamed: "${input.newName}"`,
    html: baseEmailLayout({
      title,
      preheader,
      bodyHtml,
      footerNote: "If you did not make this change, please contact your shop owner immediately."
    }),
    text: `Your shop has been renamed from "${input.oldName}" to "${input.newName}" by ${input.changedByEmail}.`
  };
}
