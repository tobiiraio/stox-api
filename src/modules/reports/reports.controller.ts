import type { Request, Response } from "express";
import { z } from "zod";
import { Sale } from "../sales/sale.model.js";
import { SaleItem } from "../sales/saleItem.model.js";
import { InventoryBalance } from "../inventory/inventoryBalance.model.js";

function getShopId(req: any) {
  const shopId = req.user?.shopId;
  if (!shopId) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return shopId as string;
}

const querySchema = z.object({
  period: z.enum(["today", "week", "month", "year"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10), 1), 50) : 10))
});

type ReportRangeInput = {
  period: "today" | "week" | "month" | "year" | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
};

function getDateRange(input: ReportRangeInput) {
  const now = new Date();

  if (input.dateFrom || input.dateTo) {
    const from = input.dateFrom
      ? new Date(`${input.dateFrom}T00:00:00.000Z`)
      : new Date(0);

    const to = input.dateTo
      ? new Date(`${input.dateTo}T23:59:59.999Z`)
      : now;

    return { from, to };
  }

  const period = input.period ?? "today";

  if (period === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);

    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    return { from, to };
  }

  if (period === "week") {
    const from = new Date(now);
    const day = from.getDay();
    const diff = day === 0 ? 6 : day - 1;

    from.setDate(from.getDate() - diff);
    from.setHours(0, 0, 0, 0);

    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    return { from, to };
  }

  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);

    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    return { from, to };
  }

  const from = new Date(now.getFullYear(), 0, 1);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

export async function getSalesSummary(req: Request, res: Response) {
  const shopId = getShopId(req);
  const query = querySchema.parse(req.query);

  const { from, to } = getDateRange({
    period: query.period,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo
  });

  const items = await Sale.find({
    shopId,
    soldAt: { $gte: from, $lte: to }
  });

  const summary = items.reduce(
    (acc, item) => {
      acc.salesCount += 1;
      acc.revenue += item.totalAmount;
      acc.cost += item.totalCost;
      acc.profit += item.grossProfit;
      return acc;
    },
    { salesCount: 0, revenue: 0, cost: 0, profit: 0 }
  );

  return res.json({
    ok: true,
    range: { from, to },
    summary
  });
}

export async function getTopProducts(req: Request, res: Response) {
  const shopId = getShopId(req);
  const query = querySchema.parse(req.query);

  const { from, to } = getDateRange({
    period: query.period,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo
  });

  const limit = query.limit ?? 10;

  const items = await SaleItem.aggregate([
    {
      $lookup: {
        from: "sales",
        localField: "saleId",
        foreignField: "_id",
        as: "sale"
      }
    },
    { $unwind: "$sale" },
    {
      $match: {
        shopId,
        "sale.shopId": shopId,
        "sale.soldAt": { $gte: from, $lte: to }
      }
    },
    {
      $group: {
        _id: "$productId",
        productName: { $first: "$productNameSnapshot" },
        qtySold: { $sum: "$quantity" },
        revenue: { $sum: "$lineTotal" },
        cost: { $sum: "$lineCost" },
        profit: { $sum: "$lineProfit" }
      }
    },
    { $sort: { qtySold: -1, revenue: -1 } },
    { $limit: limit }
  ]);

  return res.json({
    ok: true,
    range: { from, to },
    items
  });
}

export async function getLowStock(req: Request, res: Response) {
  const shopId = getShopId(req);

  const items = await InventoryBalance.aggregate([
    { $match: { shopId, qtyOnHand: { $lte: 5 } } },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $match: {
        "product.shopId": shopId,
        "product.isActive": true
      }
    },
    {
      $project: {
        _id: 1,
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
          sellPrice: "$product.sellPrice"
        }
      }
    },
    { $sort: { qtyOnHand: 1, "product.name": 1 } }
  ]);

  return res.json({
    ok: true,
    items
  });
}