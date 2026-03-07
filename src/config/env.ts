import dotenv from "dotenv";
dotenv.config();

export const env = {

  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean),

  mongoUri: process.env.MONGODB_URI ?? "",

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",

  smtp: {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.MAIL_FROM ?? ""
  },

  brevo: {
  apiKey: process.env.BREVO_API_KEY ?? "",
  senderEmail: process.env.BREVO_SENDER_EMAIL ?? "",
  senderName: process.env.BREVO_SENDER_NAME ?? "STOX",
},

  otp: {
    length: Number(process.env.OTP_LENGTH ?? 6),
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10)
  }
};

export function assertEnv() {
  const required = [
    env.mongoUri,
    env.jwtAccessSecret,
    env.jwtRefreshSecret,
    env.smtp.user,
    env.smtp.pass,
    env.smtp.from
  ];
  if (required.some((v) => !v)) {
    throw new Error("Missing required environment variables. Check .env");
  }
}