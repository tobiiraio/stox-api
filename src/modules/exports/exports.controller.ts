import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import { Product } from "../products/product.model.js";
import { Variant } from "../products/variant.model.js";
import { Sale } from "../sales/sale.model.js";
import { SaleItem } from "../sales/saleItem.model.js";
import { Purchase } from "../purchases/purchase.model.js";
import { PurchaseItem } from "../purchases/purchaseItem.model.js";
import { InventoryBalance } from "../inventory/inventoryBalance.model.js";
import { StockMovement, STOCK_MOVEMENT_TYPES } from "../inventory/stockMovement.model.js";
import { Supplier } from "../suppliers/supplier.model.js";
import { User } from "../users/user.model.js";

import {
  type ExportColumn,
  type ExportFormat,
  streamExport,
} from "../../utils/exportFormat.js";

function getShopId(req: Request): string {
  const shopId = (req as any).user?.shopId;
  if (!shopId) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return shopId;
}

function toObjectId(id: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

function parseFormat(req: Request): ExportFormat {
  if (req.path.endsWith(".csv")) return "csv";
  if (req.path.endsWith(".xlsx")) return "xlsx";
  const err: any = new Error(`Unsupported export format for path: ${req.path}`);
  err.statusCode = 400;
  throw err;
}

const dateStringSchema = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined))
  .pipe(
    z
      .date()
      .optional()
      .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
        message: "Invalid date",
      })
  );

const boolStringSchema = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => (v ? v === "true" : undefined));

// ============================================================
// Products
// ============================================================

const productExportQuerySchema = z.object({
  q: z.string().optional(),
  isActive: boolStringSchema,
  categoryId: z.string().optional(),
  sortBy: z.enum(["date_desc", "date_asc", "price_asc", "price_desc"]).optional(),
  minPrice: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().min(0).optional()),
  maxPrice: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().min(0).optional()),
});

async function computeStockMap(shopId: string): Promise<Map<string, number>> {
  const balances = await InventoryBalance.aggregate([
    { $match: { shopId } },
    { $group: { _id: "$productId", stockQty: { $sum: "$qtyOnHand" } } },
  ]);
  return new Map<string, number>(balances.map((b) => [String(b._id), b.stockQty as number]));
}

const productColumns: ExportColumn[] = [
  { header: "Name", key: "name", width: 32 },
  { header: "SKU", key: "sku", width: 14 },
  { header: "Barcode", key: "barcode", width: 16 },
  { header: "Category", key: "categoryName", width: 20 },
  { header: "Description", key: "description", width: 30 },
  { header: "Unit", key: "unit", width: 10 },
  { header: "Sell Unit", key: "sellUnit", width: 12 },
  { header: "Purchase Unit", key: "purchaseUnit", width: 14 },
  { header: "Pack Size", key: "packSize", width: 10 },
  { header: "Cost Price", key: "costPrice", width: 12 },
  { header: "Sell Price", key: "sellPrice", width: 12 },
  { header: "Stock Qty", key: "stockQty", width: 10 },
  { header: "Active", key: "isActive", width: 8 },
  { header: "Created At", key: "createdAt", width: 22 },
];

async function exportProducts(req: Request, res: Response, format: ExportFormat): Promise<void> {
  const shopId = getShopId(req);
  const query = productExportQuerySchema.parse(req.query);

  const filter: any = { shopId };
  if (typeof query.isActive === "boolean") filter.isActive = query.isActive;
  if (query.categoryId) {
    const oid = toObjectId(query.categoryId);
    if (!oid) {
      res.status(400).json({ ok: false, message: "Invalid categoryId" });
      return;
    }
    filter.categoryId = oid;
  }
  if (query.q) {
    const q = query.q.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { sku: { $regex: q, $options: "i" } },
      { barcode: { $regex: q, $options: "i" } },
      { categoryName: { $regex: q, $options: "i" } },
    ];
  }
  if (query.minPrice !== undefined) filter.sellPrice = { ...filter.sellPrice, $gte: query.minPrice };
  if (query.maxPrice !== undefined) filter.sellPrice = { ...filter.sellPrice, $lte: query.maxPrice };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    date_desc: { createdAt: -1 },
    date_asc: { createdAt: 1 },
    price_asc: { sellPrice: 1 },
    price_desc: { sellPrice: -1 },
  };
  const sort = sortMap[query.sortBy ?? "date_desc"] ?? { createdAt: -1 };

  const stockMap = await computeStockMap(shopId);
  const cursor = Product.find(filter).sort(sort).lean().cursor();

  const rows = (async function* () {
    for await (const p of cursor) {
      yield {
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        categoryName: p.categoryName,
        description: p.description,
        unit: p.unit,
        sellUnit: p.sellUnit,
        purchaseUnit: p.purchaseUnit,
        packSize: p.packSize,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        stockQty: stockMap.get(String(p._id)) ?? 0,
        isActive: p.isActive,
        createdAt: p.createdAt,
      };
    }
  })();

  await streamExport(res, format, shopId, "products", productColumns, rows);
}

export async function exportProductsHandler(req: Request, res: Response) {
  return exportProducts(req, res, parseFormat(req));
}

// ============================================================
// Product Variants (nested under a product)
// ============================================================

const variantColumns: ExportColumn[] = [
  { header: "Product ID", key: "productId", width: 26 },
  { header: "Variant Name", key: "name", width: 24 },
  { header: "Type", key: "type", width: 10 },
  { header: "Active", key: "isActive", width: 8 },
  { header: "Created At", key: "createdAt", width: 22 },
];

const variantExportQuerySchema = z.object({
  isActive: boolStringSchema,
});

async function exportVariants(req: Request, res: Response, format: ExportFormat): Promise<void> {
  const shopId = getShopId(req);
  const productId = (req.params as any).productId;
  const oid = productId ? toObjectId(productId) : null;
  if (!oid) {
    res.status(400).json({ ok: false, message: "Invalid productId" });
    return;
  }
  const query = variantExportQuerySchema.parse(req.query);

  const filter: any = { shopId, productId: oid };
  if (typeof query.isActive === "boolean") filter.isActive = query.isActive;

  const cursor = Variant.find(filter).sort({ name: 1 }).lean().cursor();
  const rows = (async function* () {
    for await (const v of cursor) {
      yield {
        productId: String(v.productId),
        name: v.name,
        type: v.type,
        isActive: v.isActive,
        createdAt: v.createdAt,
      };
    }
  })();

  await streamExport(res, format, shopId, `variants-${productId}`, variantColumns, rows);
}

export async function exportVariantsHandler(req: Request, res: Response) {
  return exportVariants(req, res, parseFormat(req));
}

// ============================================================
// Sales
// ============================================================

const salesExportQuerySchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY", "CARD"]).optional(),
  detail: z.enum(["summary", "lines"]).optional().default("summary"),
});

const salesSummaryColumns: ExportColumn[] = [
  { header: "Sale Number", key: "saleNumber", width: 16 },
  { header: "Sold At", key: "soldAt", width: 22 },
  { header: "Customer Name", key: "customerName", width: 22 },
  { header: "Customer Phone", key: "customerPhone", width: 16 },
  { header: "Payment Method", key: "paymentMethod", width: 14 },
  { header: "Total Amount", key: "totalAmount", width: 14 },
  { header: "Total Cost", key: "totalCost", width: 14 },
  { header: "Gross Profit", key: "grossProfit", width: 14 },
  { header: "Notes", key: "notes", width: 28 },
];

const salesLinesColumns: ExportColumn[] = [
  { header: "Sale Number", key: "saleNumber", width: 16 },
  { header: "Sold At", key: "soldAt", width: 22 },
  { header: "Payment Method", key: "paymentMethod", width: 14 },
  { header: "Customer Name", key: "customerName", width: 22 },
  { header: "Product", key: "productNameSnapshot", width: 28 },
  { header: "Variant", key: "variantId", width: 14 },
  { header: "Quantity", key: "quantity", width: 10 },
  { header: "Unit Price", key: "unitPrice", width: 12 },
  { header: "Unit Cost", key: "unitCostSnapshot", width: 12 },
  { header: "Line Total", key: "lineTotal", width: 12 },
  { header: "Line Cost", key: "lineCost", width: 12 },
  { header: "Line Profit", key: "lineProfit", width: 12 },
];

async function exportSales(req: Request, res: Response, format: ExportFormat) {
  const shopId = getShopId(req);
  const query = salesExportQuerySchema.parse(req.query);

  const filter: any = { shopId };
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.from || query.to) {
    filter.soldAt = {};
    if (query.from) filter.soldAt.$gte = query.from;
    if (query.to) filter.soldAt.$lte = query.to;
  }

  if (query.detail === "lines") {
    const saleCursor = Sale.find(filter).sort({ soldAt: -1, createdAt: -1 }).lean().cursor();
    const rows = (async function* () {
      for await (const s of saleCursor) {
        const items = await SaleItem.find({ shopId, saleId: s._id }).lean();
        for (const it of items) {
          yield {
            saleNumber: s.saleNumber,
            soldAt: s.soldAt,
            paymentMethod: s.paymentMethod,
            customerName: s.customerName,
            productNameSnapshot: it.productNameSnapshot,
            variantId: it.variantId ? String(it.variantId) : "",
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            unitCostSnapshot: it.unitCostSnapshot,
            lineTotal: it.lineTotal,
            lineCost: it.lineCost,
            lineProfit: it.lineProfit,
          };
        }
      }
    })();
    await streamExport(res, format, shopId, "sales-lines", salesLinesColumns, rows);
    return;
  }

  const cursor = Sale.find(filter).sort({ soldAt: -1, createdAt: -1 }).lean().cursor();
  const rows = (async function* () {
    for await (const s of cursor) {
      yield {
        saleNumber: s.saleNumber,
        soldAt: s.soldAt,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        paymentMethod: s.paymentMethod,
        totalAmount: s.totalAmount,
        totalCost: s.totalCost,
        grossProfit: s.grossProfit,
        notes: s.notes,
      };
    }
  })();

  await streamExport(res, format, shopId, "sales", salesSummaryColumns, rows);
}

export async function exportSalesHandler(req: Request, res: Response) {
  return exportSales(req, res, parseFormat(req));
}

// ============================================================
// Purchases
// ============================================================

const purchasesExportQuerySchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  supplierId: z.string().optional(),
  detail: z.enum(["summary", "lines"]).optional().default("summary"),
});

const purchasesSummaryColumns: ExportColumn[] = [
  { header: "Invoice Number", key: "invoiceNumber", width: 18 },
  { header: "Purchased At", key: "purchasedAt", width: 22 },
  { header: "Supplier", key: "supplierName", width: 24 },
  { header: "Total Amount", key: "totalAmount", width: 14 },
  { header: "Notes", key: "notes", width: 28 },
];

const purchasesLinesColumns: ExportColumn[] = [
  { header: "Invoice Number", key: "invoiceNumber", width: 18 },
  { header: "Purchased At", key: "purchasedAt", width: 22 },
  { header: "Supplier", key: "supplierName", width: 24 },
  { header: "Product", key: "productNameSnapshot", width: 28 },
  { header: "Variant", key: "variantId", width: 14 },
  { header: "Quantity", key: "quantity", width: 10 },
  { header: "Unit Cost", key: "unitCost", width: 12 },
  { header: "Line Total", key: "lineTotal", width: 12 },
  { header: "Packs Ordered", key: "packsOrdered", width: 12 },
  { header: "Pack Size", key: "packSizeSnapshot", width: 10 },
];

async function exportPurchases(req: Request, res: Response, format: ExportFormat): Promise<void> {
  const shopId = getShopId(req);
  const query = purchasesExportQuerySchema.parse(req.query);

  const filter: any = { shopId };
  if (query.supplierId) {
    const oid = toObjectId(query.supplierId);
    if (!oid) {
      res.status(400).json({ ok: false, message: "Invalid supplierId" });
      return;
    }
    filter.supplierId = oid;
  }
  if (query.from || query.to) {
    filter.purchasedAt = {};
    if (query.from) filter.purchasedAt.$gte = query.from;
    if (query.to) filter.purchasedAt.$lte = query.to;
  }

  if (query.detail === "lines") {
    const purchaseCursor = Purchase.find(filter).sort({ purchasedAt: -1, createdAt: -1 }).lean().cursor();
    const rows = (async function* () {
      for await (const p of purchaseCursor) {
        const items = await PurchaseItem.find({ shopId, purchaseId: p._id }).lean();
        for (const it of items) {
          yield {
            invoiceNumber: p.invoiceNumber,
            purchasedAt: p.purchasedAt,
            supplierName: p.supplierName,
            productNameSnapshot: it.productNameSnapshot,
            variantId: it.variantId ? String(it.variantId) : "",
            quantity: it.quantity,
            unitCost: it.unitCost,
            lineTotal: it.lineTotal,
            packsOrdered: it.packsOrdered,
            packSizeSnapshot: it.packSizeSnapshot,
          };
        }
      }
    })();
    await streamExport(res, format, shopId, "purchases-lines", purchasesLinesColumns, rows);
    return;
  }

  const cursor = Purchase.find(filter).sort({ purchasedAt: -1, createdAt: -1 }).lean().cursor();
  const rows = (async function* () {
    for await (const p of cursor) {
      yield {
        invoiceNumber: p.invoiceNumber,
        purchasedAt: p.purchasedAt,
        supplierName: p.supplierName,
        totalAmount: p.totalAmount,
        notes: p.notes,
      };
    }
  })();

  await streamExport(res, format, shopId, "purchases", purchasesSummaryColumns, rows);
}

export async function exportPurchasesHandler(req: Request, res: Response) {
  return exportPurchases(req, res, parseFormat(req));
}

// ============================================================
// Inventory Balances
// ============================================================

const balancesExportQuerySchema = z.object({
  q: z.string().optional(),
  lowStockOnly: boolStringSchema,
});

const balancesColumns: ExportColumn[] = [
  { header: "Product", key: "name", width: 32 },
  { header: "SKU", key: "sku", width: 14 },
  { header: "Barcode", key: "barcode", width: 16 },
  { header: "Category", key: "categoryName", width: 20 },
  { header: "Unit", key: "unit", width: 10 },
  { header: "Qty On Hand", key: "qtyOnHand", width: 12 },
  { header: "Sell Price", key: "sellPrice", width: 12 },
  { header: "Product Active", key: "productActive", width: 12 },
  { header: "Updated At", key: "updatedAt", width: 22 },
];

async function exportBalances(req: Request, res: Response, format: ExportFormat) {
  const shopId = getShopId(req);
  const query = balancesExportQuerySchema.parse(req.query);

  const pipeline: any[] = [{ $match: { shopId } }];
  if (query.lowStockOnly === true) pipeline.push({ $match: { qtyOnHand: { $lte: 5 } } });
  pipeline.push(
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" }
  );
  if (query.q) {
    const q = query.q.trim();
    pipeline.push({
      $match: {
        $or: [
          { "product.name": { $regex: q, $options: "i" } },
          { "product.sku": { $regex: q, $options: "i" } },
          { "product.barcode": { $regex: q, $options: "i" } },
        ],
      },
    });
  }
  pipeline.push({ $sort: { "product.name": 1 } });

  const cursor = InventoryBalance.aggregate(pipeline).cursor();
  const rows = (async function* () {
    for await (const doc of cursor as any) {
      yield {
        name: doc.product.name,
        sku: doc.product.sku,
        barcode: doc.product.barcode,
        categoryName: doc.product.categoryName,
        unit: doc.product.unit,
        qtyOnHand: doc.qtyOnHand,
        sellPrice: doc.product.sellPrice,
        productActive: doc.product.isActive,
        updatedAt: doc.updatedAt,
      };
    }
  })();

  await streamExport(res, format, shopId, "inventory-balances", balancesColumns, rows);
}

export async function exportBalancesHandler(req: Request, res: Response) {
  return exportBalances(req, res, parseFormat(req));
}

// ============================================================
// Inventory Stock Movements
// ============================================================

const movementsExportQuerySchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  productId: z.string().optional(),
  type: z.enum(STOCK_MOVEMENT_TYPES).optional(),
});

const movementsColumns: ExportColumn[] = [
  { header: "Date", key: "createdAt", width: 22 },
  { header: "Type", key: "type", width: 12 },
  { header: "Product ID", key: "productId", width: 26 },
  { header: "Quantity", key: "quantity", width: 10 },
  { header: "Qty Before", key: "qtyBefore", width: 12 },
  { header: "Qty After", key: "qtyAfter", width: 12 },
  { header: "Reference Type", key: "referenceType", width: 14 },
  { header: "Reference ID", key: "referenceId", width: 26 },
  { header: "Note", key: "note", width: 28 },
];

async function exportMovements(req: Request, res: Response, format: ExportFormat): Promise<void> {
  const shopId = getShopId(req);
  const query = movementsExportQuerySchema.parse(req.query);

  const filter: any = { shopId };
  if (query.type) filter.type = query.type;
  if (query.productId) {
    const oid = toObjectId(query.productId);
    if (!oid) {
      res.status(400).json({ ok: false, message: "Invalid productId" });
      return;
    }
    filter.productId = oid;
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }

  const cursor = StockMovement.find(filter).sort({ createdAt: -1 }).lean().cursor();
  const rows = (async function* () {
    for await (const m of cursor) {
      yield {
        createdAt: m.createdAt,
        type: m.type,
        productId: String(m.productId),
        quantity: m.quantity,
        qtyBefore: m.qtyBefore,
        qtyAfter: m.qtyAfter,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        note: m.note,
      };
    }
  })();

  await streamExport(res, format, shopId, "stock-movements", movementsColumns, rows);
}

export async function exportMovementsHandler(req: Request, res: Response) {
  return exportMovements(req, res, parseFormat(req));
}

// ============================================================
// Suppliers
// ============================================================

const suppliersExportQuerySchema = z.object({
  q: z.string().optional(),
  isActive: boolStringSchema,
});

const suppliersColumns: ExportColumn[] = [
  { header: "Name", key: "name", width: 28 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Email", key: "email", width: 26 },
  { header: "Notes", key: "notes", width: 28 },
  { header: "Active", key: "isActive", width: 8 },
  { header: "Created At", key: "createdAt", width: 22 },
];

async function exportSuppliers(req: Request, res: Response, format: ExportFormat) {
  const shopId = getShopId(req);
  const query = suppliersExportQuerySchema.parse(req.query);

  const filter: any = { shopId };
  if (typeof query.isActive === "boolean") filter.isActive = query.isActive;
  if (query.q) filter.name = { $regex: query.q.trim(), $options: "i" };

  const cursor = Supplier.find(filter).sort({ name: 1 }).lean().cursor();
  const rows = (async function* () {
    for await (const s of cursor) {
      yield {
        name: s.name,
        phone: s.phone,
        email: s.email,
        notes: s.notes,
        isActive: s.isActive,
        createdAt: s.createdAt,
      };
    }
  })();

  await streamExport(res, format, shopId, "suppliers", suppliersColumns, rows);
}

export async function exportSuppliersHandler(req: Request, res: Response) {
  return exportSuppliers(req, res, parseFormat(req));
}

// ============================================================
// Staff (Users)
// ============================================================

const staffColumns: ExportColumn[] = [
  { header: "Email", key: "email", width: 28 },
  { header: "Role", key: "role", width: 10 },
  { header: "Active", key: "isActive", width: 8 },
  { header: "Created At", key: "createdAt", width: 22 },
];

async function exportStaff(req: Request, res: Response, format: ExportFormat) {
  const shopId = getShopId(req);

  const cursor = User.find({ shopId }).sort({ createdAt: 1 }).lean().cursor();
  const rows = (async function* () {
    for await (const u of cursor) {
      yield {
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      };
    }
  })();

  await streamExport(res, format, shopId, "staff", staffColumns, rows);
}

export async function exportStaffHandler(req: Request, res: Response) {
  return exportStaff(req, res, parseFormat(req));
}
