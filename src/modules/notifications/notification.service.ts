import { sendMail } from "../../config/mail.js";
import type { EmailTemplate } from "./templates/types.js";

export type SendEmailInput = {
  to: string;
  template: EmailTemplate;
};

export async function sendEmail(input: SendEmailInput) {
  const { to, template } = input;
  await sendMail(to, template.subject, template.html);
}