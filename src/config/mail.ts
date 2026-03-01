import nodemailer from "nodemailer";
import { env } from "./env.js";

export const mailer = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: { user: env.smtp.user, pass: env.smtp.pass }
});

export async function sendMail(to: string, subject: string, html: string) {
  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html
  });
}