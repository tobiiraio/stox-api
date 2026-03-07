import type { Request, Response } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

import { Shop } from "./shop.model.js";
import { User } from "../users/user.model.js";
import { Otp } from "../auth/otp.model.js";
import { env } from "../../config/env.js";
import { sendMail } from "../../config/mail.js";
// import { newOwnerShopEmailTemplate } from "../notifications/templates/new-owner-shop.template.js";
import { otpEmailTemplate } from "../notifications/templates/otp.template.js";

const createShopSchema = z.object({
  shopName: z.string().min(2).max(100),
  ownerEmail: z.string().email()
});

const updateShopSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional()
});

function generateNumericOtp(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

function getUserFromReq(req: Request) {
  const user = (req as any).user;
  if (!user) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return user as {
    sub: string;
    shopId: string;
    role: "OWNER" | "ADMIN" | "STAFF";
  };
}

function getParamId(req: Request, key: string) {
  const value = (req.params as Record<string, string | undefined>)[key];
  if (!value) {
    const err: any = new Error(`Missing ${key}`);
    err.statusCode = 400;
    throw err;
  }
  return value;
}

export async function createShop(req: Request, res: Response) {
  const { shopName, ownerEmail } = createShopSchema.parse(req.body);
  const ownerEmailLower = ownerEmail.toLowerCase();

  const shopId = `stx_${nanoid(8)}`;

  const exists = await Shop.findOne({ shopId });
  if (exists) {
    const err: any = new Error("Please retry shop creation.");
    err.statusCode = 500;
    throw err;
  }

  const shop = await Shop.create({
    shopId,
    name: shopName.trim(),
    ownerEmail: ownerEmailLower,
    isActive: false
  });

  const owner = await User.findOneAndUpdate(
    { shopId, email: ownerEmailLower },
    {
      $setOnInsert: {
        shopId,
        email: ownerEmailLower,
        role: "OWNER",
        isActive: false
      }
    },
    { upsert: true, new: true }
  );

  const code = generateNumericOtp(env.otp.length);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60_000);

  await Otp.updateMany(
    { email: ownerEmailLower, shopId, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  await Otp.create({
    email: ownerEmailLower,
    shopId,
    codeHash,
    expiresAt,
    attempts: 0,
    usedAt: null
  });

  try {
        const otpTpl = otpEmailTemplate({
        code,
        ttlMinutes: env.otp.ttlMinutes,
        shopName: shop.name,
        purpose: "verification"
      });

    await sendMail(owner.email, otpTpl.subject, otpTpl.html, otpTpl.text);
  } catch (mailErr) {
    console.error("Failed to send onboarding OTP email:", mailErr);
  }

  return res.status(201).json({
    ok: true,
    message: "Verification code sent to owner email.",
    shop: {
      shopId: shop.shopId,
      name: shop.name,
      isActive: shop.isActive
    },
    owner: {
      id: String(owner._id),
      email: owner.email,
      role: owner.role,
      isActive: owner.isActive
    }
  });
}

export async function listMyShops(req: Request, res: Response) {
  const user = getUserFromReq(req);

  const currentUser = await User.findById(user.sub);
  if (!currentUser) {
    return res.status(404).json({
      ok: false,
      message: "User not found."
    });
  }

  const membershipsForEmail = await User.find({
    email: currentUser.email
  }).lean();

  const shopIds = membershipsForEmail.map((m) => m.shopId);

  const shops = await Shop.find({
    shopId: { $in: shopIds }
  })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    ok: true,
    items: shops
  });
}

export async function getShop(req: Request, res: Response) {
  const user = getUserFromReq(req);
  const shopId = getParamId(req, "shopId");

  const membership = await User.findOne({
    shopId,
    _id: user.sub,
    isActive: true
  });

  if (!membership) {
    return res.status(403).json({
      ok: false,
      message: "Forbidden"
    });
  }

  const shop = await Shop.findOne({ shopId });
  if (!shop) {
    return res.status(404).json({
      ok: false,
      message: "Shop not found"
    });
  }

  return res.json({
    ok: true,
    shop
  });
}

export async function updateShop(req: Request, res: Response) {
  const user = getUserFromReq(req);
  const shopId = getParamId(req, "shopId");
  const data = updateShopSchema.parse(req.body);

  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return res.status(403).json({
      ok: false,
      message: "Forbidden"
    });
  }

  if (user.shopId !== shopId) {
    return res.status(403).json({
      ok: false,
      message: "Forbidden"
    });
  }

  const update: { name?: string; isActive?: boolean } = {};
  if (typeof data.name === "string") update.name = data.name.trim();
  if (typeof data.isActive === "boolean") update.isActive = data.isActive;

  const shop = await Shop.findOneAndUpdate({ shopId }, update, { new: true });
  if (!shop) {
    return res.status(404).json({
      ok: false,
      message: "Shop not found"
    });
  }

  return res.json({
    ok: true,
    shop
  });
}

export async function deactivateShop(req: Request, res: Response) {
  const user = getUserFromReq(req);
  const shopId = getParamId(req, "shopId");

  if (user.role !== "OWNER") {
    return res.status(403).json({
      ok: false,
      message: "Only the owner can deactivate a shop."
    });
  }

  if (user.shopId !== shopId) {
    return res.status(403).json({
      ok: false,
      message: "Forbidden"
    });
  }

  const shop = await Shop.findOneAndUpdate(
    { shopId },
    { isActive: false },
    { new: true }
  );

  if (!shop) {
    return res.status(404).json({
      ok: false,
      message: "Shop not found"
    });
  }

  await User.updateMany({ shopId }, { $set: { isActive: false } });

  return res.json({
    ok: true,
    message: "Shop deactivated successfully.",
    shop
  });
}