import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../../config/env.js";
import { sendMail } from "../../config/mail.js";
import { Otp } from "./otp.model.js";
import { User } from "../users/user.model.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.js";
import { otpEmailTemplate } from "../notifications/templates/otp.template.js";
import { newOwnerShopEmailTemplate } from "../notifications/templates/new-owner-shop.template.js";
import { Shop } from "../shops/shop.model.js";
import type { RequestOtpResult } from "./auth.types.js";

function generateNumericOtp(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

async function sendOtpForMembership(
  email: string,
  shopId: string,
  shopName?: string
) {
  const normalizedEmail = email.toLowerCase();

  const code = generateNumericOtp(env.otp.length);
  const codeHash = await bcrypt.hash(code, 10);

  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60_000);

  await Otp.updateMany(
    { email: normalizedEmail, shopId, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  await Otp.create({
    email: normalizedEmail,
    shopId,
    codeHash,
    expiresAt,
    attempts: 0,
    usedAt: null
  });

  const tpl = otpEmailTemplate(
    shopName
      ? {
          code,
          ttlMinutes: env.otp.ttlMinutes,
          shopName,
          purpose: "login"
        }
      : {
          code,
          ttlMinutes: env.otp.ttlMinutes,
          purpose: "login"
        }
  );

  await sendMail(normalizedEmail, tpl.subject, tpl.html, tpl.text);
}

export async function requestOtpService(
  email: string
): Promise<RequestOtpResult> {
  const parsedEmail = z.string().email().parse(email).toLowerCase();

  const users = await User.find({
    email: parsedEmail,
    isActive: true
  }).lean();

  if (users.length === 0) {
    const err: any = new Error("No active account found for this email.");
    err.statusCode = 404;
    throw err;
  }

  const shopIds = [...new Set(users.map((u) => u.shopId))];

  const shops = await Shop.find({
    shopId: { $in: shopIds },
    isActive: true
  })
    .select("shopId name")
    .lean();

  if (shops.length === 0) {
    const err: any = new Error("No active shop found for this email.");
    err.statusCode = 404;
    throw err;
  }

  if (shops.length === 1) {
    const shop = shops[0];

    if (!shop) {
      const err: any = new Error("Shop lookup failed.");
      err.statusCode = 500;
      throw err;
    }

    await sendOtpForMembership(parsedEmail, shop.shopId, shop.name);

    return {
      mode: "OTP_SENT",
      shop: {
        shopId: shop.shopId,
        name: shop.name
      }
    };
  }

  return {
    mode: "SELECT_SHOP",
    shops: shops
      .map((shop) => ({
        shopId: shop.shopId,
        name: shop.name
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}

export async function requestOtpForShopService(
  email: string,
  shopId: string
) {
  const parsedEmail = z.string().email().parse(email).toLowerCase();
  const tenant = z.string().min(2).max(100).parse(shopId);

  const shop = await Shop.findOne({
    shopId: tenant,
    isActive: true
  });

  if (!shop) {
    const err: any = new Error("Shop not found or inactive.");
    err.statusCode = 404;
    throw err;
  }

  const user = await User.findOne({
    email: parsedEmail,
    shopId: tenant,
    isActive: true
  });

  if (!user) {
    const err: any = new Error("User not found for this shop.");
    err.statusCode = 403;
    throw err;
  }

  await sendOtpForMembership(parsedEmail, tenant, shop.name);

  return {
    mode: "OTP_SENT",
    shop: {
      shopId: shop.shopId,
      name: shop.name
    }
  };
}

export async function verifyOtpService(
  email: string,
  shopId: string,
  code: string
) {
  const parsedEmail = z.string().email().parse(email).toLowerCase();
  const tenant = z.string().min(2).max(100).parse(shopId);
  const parsedCode = z.string().min(4).max(10).parse(code);

  const otp = await Otp.findOne({
    email: parsedEmail,
    shopId: tenant,
    usedAt: null
  }).sort({ createdAt: -1 });

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

  const user = await User.findOne({
    email: parsedEmail,
    shopId: tenant
  });

  if (!user) {
    const err: any = new Error("User does not exist.");
    err.statusCode = 403;
    throw err;
  }

  const shop = await Shop.findOne({
    shopId: tenant
  });

  if (!shop) {
    const err: any = new Error("Shop does not exist.");
    err.statusCode = 404;
    throw err;
  }

  // Owner onboarding activation
  if (user.role === "OWNER" && !user.isActive && !shop.isActive) {
    user.isActive = true;
    await user.save();

    shop.isActive = true;
    await shop.save();

    try {
      const tpl = newOwnerShopEmailTemplate({
        ownerEmail: user.email,
        shopName: shop.name,
        shopId: shop.shopId
      });

      await sendMail(user.email, tpl.subject, tpl.html, tpl.text);
    } catch (mailErr) {
      console.error(
        "Failed to send shop created email after verification:",
        mailErr
      );
    }
  }

  if (!user.isActive) {
    const err: any = new Error("User is inactive.");
    err.statusCode = 403;
    throw err;
  }

  if (!shop.isActive) {
    const err: any = new Error("Shop is inactive.");
    err.statusCode = 403;
    throw err;
  }

  const payload = {
    sub: String(user._id),
    shopId: user.shopId,
    role: user.role
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: {
      id: String(user._id),
      email: user.email,
      shopId: user.shopId,
      role: user.role
    }
  };
}