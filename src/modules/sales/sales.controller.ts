import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Sale } from "./sale.model.js";
import { SaleItem } from "./saleItem.model.js";
import { createSaleWithItems, parseCreateSaleInput } from "./sales.service.js";

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

export async function createSale(req: Request, res: Response) {
  const shopId = getShopId(req);
  const input = parseCreateSaleInput(req.body);

  const result = await createSaleWithItems(shopId, input);

  return res.status(201).json({
    ok: true,
    sale: result.sale,
    items: result.items
  });
}

export async function listSales(req: Request, res: Response) {
  const shopId = getShopId(req);

  const items = await Sale.find({ shopId }).sort({ soldAt: -1, createdAt: -1 });

  return res.json({ ok: true, items });
}

export async function getSale(req: Request, res: Response) {
  const shopId = getShopId(req);
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({ ok: false, message: "Missing sale id" });
  }

  const oid = toObjectId(id);
  if (!oid) {
    return res.status(400).json({ ok: false, message: "Invalid sale id" });
  }

  const sale = await Sale.findOne({ _id: oid, shopId });
  if (!sale) {
    return res.status(404).json({ ok: false, message: "Sale not found" });
  }

  const items = await SaleItem.find({ shopId, saleId: oid });

  return res.json({
    ok: true,
    sale,
    items
  });
}