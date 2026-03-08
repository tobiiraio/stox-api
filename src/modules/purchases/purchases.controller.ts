import type { Request, Response } from "express";
import { Types } from "mongoose";
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

export async function listPurchases(req: Request, res: Response) {
  const shopId = getShopId(req);

  const items = await Purchase.find({ shopId }).sort({ purchasedAt: -1, createdAt: -1 });

  return res.json({ ok: true, items });
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