export type BaseEmailLayoutInput = {
  title: string;
  preheader?: string;
  bodyHtml: string;
  footerNote?: string;
};

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function baseEmailLayout(input: BaseEmailLayoutInput) {
  const title = escapeHtml(input.title);
  const preheader = escapeHtml(input.preheader ?? "");
  const footerNote = escapeHtml(input.footerNote ?? "If you did not request this, you can ignore this email.");

  // Preheader is hidden in body but shown in many inbox previews.
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;">
  ${preheaderHtml}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e8ea;">
          
          <!-- Header -->
          <tr>
            <td style="padding:18px 20px;background:#111827;color:#ffffff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;">
              <div style="font-size:16px;font-weight:700;letter-spacing:0.2px;">STOX</div>
              <div style="font-size:12px;opacity:0.9;margin-top:2px;">Shop management</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:22px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111827;">
              <h1 style="margin:0 0 12px 0;font-size:18px;line-height:1.25;">${title}</h1>
              ${input.bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 20px;background:#f9fafb;border-top:1px solid #eef0f2;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#6b7280;font-size:12px;line-height:1.4;">
              <div style="margin-bottom:10px;">${footerNote}</div>
              <div>© ${new Date().getFullYear()} Stox</div>
            </td>
          </tr>

        </table>

        <div style="max-width:600px;margin-top:10px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#9ca3af;font-size:11px;line-height:1.4;">
          This message was sent automatically. Please do not reply.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}