import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Purchase } from "./purchase.model.js";
import { PurchaseItem } from "./purchaseItem.model.js";
import { createPurchaseWithItems, parseCreatePurchaseInput } from "./purchases.service.js";

function getShopId(req: any) {
  const shopId = req.user?.shopId;
  if (!shopId) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return shopId as string;
}

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

export async function createPurchase(req: Request, res: Response) {
  const shopId = getShopId(req);
  const input = parseCreatePurchaseInput(req.body);

  const result = await createPurchaseWithItems(shopId, input);

  return res.status(201).json({
    ok: true,
    purchase: result.purchase,
    items: result.items
  });
}

const listPurchasesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10), 1), 100) : 20)),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(parseInt(v, 10), 1) : 1))
});

export async function listPurchases(req: Request, res: Response) {
  const shopId = getShopId(req);
  const query = listPurchasesQuerySchema.parse(req.query);

  const limit = query.limit;
  const page = query.page;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Purchase.find({ shopId }).sort({ purchasedAt: -1, createdAt: -1 }).skip(skip).limit(limit),
    Purchase.countDocuments({ shopId })
  ]);

  return res.json({ ok: true, page, limit, total, items });
}

export async function getPurchase(req: Request, res: Response) {
  const shopId = getShopId(req);
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({ ok: false, message: "Missing purchase id" });
  }

  const oid = toObjectId(id);
  if (!oid) {
    return res.status(400).json({ ok: false, message: "Invalid purchase id" });
  }

  const purchase = await Purchase.findOne({ _id: oid, shopId });
  if (!purchase) {
    return res.status(404).json({ ok: false, message: "Purchase not found" });
  }

  const items = await PurchaseItem.find({ shopId, purchaseId: oid });

  return res.json({
    ok: true,
    purchase,
    items
  });
}