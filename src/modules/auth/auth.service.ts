import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../../config/env.js";
import { sendMail } from "../../config/mail.js";
import { Otp } from "./otp.model.js";
import { User } from "../users/user.model.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.js";
import { otpEmailTemplate } from "../notifications/templates/otp.template.js";
import { Shop } from "../shops/shop.model.js";

function generateNumericOtp(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

export async function requestOtpService(email: string, shopId: string) {
  const parsed = z.string().email().parse(email);
  const tenant = z.string().min(2).max(100).parse(shopId);

  // ensure user exists (create as STAFF by default; you can tighten later)
  const shop = await Shop.findOne({ shopId: tenant, isActive: true });
if (!shop) {
  const err: any = new Error("Shop not found or inactive.");
  err.statusCode = 404;
  throw err;
}

const user = await User.findOne({ email: parsed.toLowerCase(), shopId: tenant, isActive: true });
if (!user) {
  const err: any = new Error("User not found for this shop.");
  err.statusCode = 403;
  throw err;
}

  const code = generateNumericOtp(env.otp.length);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60_000);

  // invalidate previous OTPs for this email+shop
  await Otp.updateMany(
    { email: parsed.toLowerCase(), shopId: tenant, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  await Otp.create({
    email: parsed.toLowerCase(),
    shopId: tenant,
    codeHash,
    expiresAt,
    attempts: 0,
    usedAt: null
  });

  const tpl = otpEmailTemplate({ code, ttlMinutes: env.otp.ttlMinutes });
  await sendMail(parsed, tpl.subject, tpl.html, tpl.text);
}

export async function verifyOtpService(email: string, shopId: string, code: string) {
  const parsedEmail = z.string().email().parse(email).toLowerCase();
  const tenant = z.string().min(2).max(100).parse(shopId);
  const parsedCode = z.string().min(4).max(10).parse(code);

  const otp = await Otp.findOne({ email: parsedEmail, shopId: tenant, usedAt: null }).sort({ createdAt: -1 });
  if (!otp) {
    const err: any = new Error("OTP not found. Request a new code.");
    err.statusCode = 400;
    throw err;
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    otp.usedAt = new Date();
    await otp.save();
    const err: any = new Error("OTP expired. Request a new code.");
    err.statusCode = 400;
    throw err;
  }

  if (otp.attempts >= 5) {
    otp.usedAt = new Date();
    await otp.save();
    const err: any = new Error("Too many attempts. Request a new code.");
    err.statusCode = 429;
    throw err;
  }

  const ok = await bcrypt.compare(parsedCode, otp.codeHash);
  otp.attempts += 1;

  if (!ok) {
    await otp.save();
    const err: any = new Error("Invalid code.");
    err.statusCode = 400;
    throw err;
  }

  otp.usedAt = new Date();
  await otp.save();

  const user = await User.findOne({ email: parsedEmail, shopId: tenant, isActive: true });
  if (!user) {
    const err: any = new Error("User is not active or does not exist.");
    err.statusCode = 403;
    throw err;
  }

  const payload = { sub: String(user._id), shopId: user.shopId, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return { accessToken, refreshToken, user: { id: String(user._id), email: user.email, shopId: user.shopId, role: user.role } };
}