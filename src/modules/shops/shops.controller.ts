import type { Request, Response } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Shop } from "./shop.model.js";
import { User } from "../users/user.model.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.js";

const createShopSchema = z.object({
  shopName: z.string().min(2).max(100),
  ownerEmail: z.string().email()
});

export async function createShop(req: Request, res: Response) {
  const { shopName, ownerEmail } = createShopSchema.parse(req.body);

  // Create a short public tenant id. Example: stx_Ab12Cd
  const shopId = `stx_${nanoid(8)}`;

  // Ensure uniqueness (rare collision safety)
  const exists = await Shop.findOne({ shopId });
  if (exists) {
    const err: any = new Error("Please retry shop creation.");
    err.statusCode = 500;
    throw err;
  }

  // Create shop
  const shop = await Shop.create({
    shopId,
    name: shopName,
    ownerEmail: ownerEmail.toLowerCase(),
    isActive: true
  });

  // Upsert owner user for this shop
  const owner = await User.findOneAndUpdate(
    { shopId, email: ownerEmail.toLowerCase() },
    {
      $setOnInsert: {
        shopId,
        email: ownerEmail.toLowerCase(),
        role: "OWNER",
        isActive: true
      }
    },
    { upsert: true, new: true }
  );

  const payload = { sub: String(owner._id), shopId, role: owner.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.status(201).json({
    ok: true,
    shop: { shopId: shop.shopId, name: shop.name },
    owner: { id: String(owner._id), email: owner.email, role: owner.role },
    accessToken,
    refreshToken
  });
}