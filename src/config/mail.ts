import { env } from "./env.js";

type BrevoSendEmailResponse = {
  messageId?: string;
};

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text?: string
) {
  if (!env.brevo.apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.brevo.apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: env.brevo.senderEmail,
        name: env.brevo.senderName,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error("Brevo sendMail error:", raw);
    throw new Error(`Brevo send failed: ${res.status} - ${raw}`);
  }

  const data = JSON.parse(raw) as BrevoSendEmailResponse;

  return data;
}