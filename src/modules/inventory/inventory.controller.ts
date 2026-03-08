import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { InventoryBalance } from "./inventoryBalance.model.js";
import { StockMovement } from "./stockMovement.model.js";
import { applyStockChange } from "./inventory.service.js";

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

const listBalancesQuerySchema = z.object({
  q: z.string().optional(),
  lowStockOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v ? v === "true" : undefined))
});

const listMovementsQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.enum(["PURCHASE", "SALE", "ADJUST_IN", "ADJUST_OUT"]).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10), 1), 100) : 50))
});

const adjustSchema = z.object({
  productId: z.string(),
  type: z.enum(["ADJUST_IN", "ADJUST_OUT"]),
  quantity: z.number().positive(),
  note: z.string().max(500).optional()
});

export async function listInventoryBalances(req: Request, res: Response) {
  const shopId = getShopId(req);
  const query = listBalancesQuerySchema.parse(req.query);

  const pipeline: any[] = [
    { $match: { shopId } },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    { $match: { "product.shopId": shopId } }
  ];

  if (query.q) {
    pipeline.push({
      $match: {
        $or: [
          { "product.name": { $regex: query.q.trim(), $options: "i" } },
          { "product.sku": { $regex: query.q.trim(), $options: "i" } },
          { "product.barcode": { $regex: query.q.trim(), $options: "i" } }
        ]
      }
    });
  }

  if (query.lowStockOnly) {
    pipeline.push({
      $match: { qtyOnHand: { $lte: 5 } }
    });
  }

  pipeline.push({
    $project: {
      _id: 1,
      shopId: 1,
      productId: 1,
      qtyOnHand: 1,
      updatedAt: 1,
      product: {
        _id: "$product._id",
        name: "$product.name",
        sku: "$product.sku",
        barcode: "$product.barcode",
        categoryName: "$product.categoryName",
        unit: "$product.unit",
        sellPrice: "$product.sellPrice",
        isActive: "$product.isActive"
      }
    }
  });

  pipeline.push({ $sort: { "product.name": 1 } });

  const items = await InventoryBalance.aggregate(pipeline);
  return res.json({ ok: true, items });
}

export async function getInventoryBalanceByProduct(req: Request, res: Response) {
  const shopId = getShopId(req);
  const id = req.params.productId;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({ ok: false, message: "Missing productId" });
  }

  const oid = toObjectId(id);
  if (!oid) {
    return res.status(400).json({ ok: false, message: "Invalid productId" });
  }

  const balance = await InventoryBalance.findOne({ shopId, productId: oid });
  if (!balance) {
    return res.status(404).json({ ok: false, message: "Inventory balance not found" });
  }

  return res.json({ ok: true, balance });
}

export async function listStockMovements(req: Request, res: Response) {
  const shopId = getShopId(req);
  const query = listMovementsQuerySchema.parse(req.query);

  const filter: any = { shopId };
  if (query.type) filter.type = query.type;

  if (query.productId) {
    const oid = toObjectId(query.productId);
    if (!oid) {
      return res.status(400).json({ ok: false, message: "Invalid productId" });
    }
    filter.productId = oid;
  }

  const limit = query.limit ?? 50;
  const items = await StockMovement.find(filter).sort({ createdAt: -1 }).limit(limit);

  return res.json({ ok: true, items });
}

export async function adjustInventory(req: Request, res: Response) {
  const shopId = getShopId(req);
  const { productId, type, quantity, note } = adjustSchema.parse(req.body);

  const result = await applyStockChange({
    shopId,
    productId,
    type,
    quantity,
    note: note ?? "",
    referenceType: "ADJUSTMENT"
  });

  return res.status(201).json({
    ok: true,
    balance: result.balance,
    movement: result.movement
  });
}