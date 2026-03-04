import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Product } from "./product.model.js";
import { ProductCategory } from "./categories/productCategory.model.js";

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

const createSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),

  sku: z.string().max(50).optional(),
  barcode: z.string().max(80).optional(),

  categoryId: z.string().optional().nullable(),

  unit: z.string().max(20).optional(),

  costPrice: z.number().min(0).optional(),
  sellPrice: z.number().min(0),

  isActive: z.boolean().optional()
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  q: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v ? v === "true" : undefined)),
  categoryId: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10), 1), 100) : 20)),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(parseInt(v, 10), 1) : 1))
});

async function resolveCategory(shopId: string, categoryId?: string | null) {
  if (!categoryId) return { categoryId: null, categoryName: "" };

  const oid = toObjectId(categoryId);
  if (!oid) {
    const err: any = new Error("Invalid categoryId");
    err.statusCode = 400;
    throw err;
  }

  const cat = await ProductCategory.findOne({ _id: oid, shopId, isActive: true });
  if (!cat) {
    const err: any = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }

  return { categoryId: cat._id, categoryName: cat.name };
}

export async function createProduct(req: Request, res: Response) {
  const shopId = getShopId(req);
  const data = createSchema.parse(req.body);

  const name = data.name.trim();
  const sku = (data.sku ?? "").trim();
  const barcode = (data.barcode ?? "").trim();

  const { categoryId, categoryName } = await resolveCategory(shopId, data.categoryId ?? null);

  const product = await Product.create({
    shopId,
    name,
    description: data.description ?? "",
    sku,
    barcode,
    categoryId,
    categoryName,
    unit: (data.unit ?? "pcs").trim(),
    costPrice: data.costPrice ?? 0,
    sellPrice: data.sellPrice,
    isActive: data.isActive ?? true
  });

  res.status(201).json({ ok: true, product });
}

export async function listProducts(req: Request, res: Response) {
  const shopId = getShopId(req);
  const query = listQuerySchema.parse(req.query);

  const filter: any = { shopId };

  if (typeof query.isActive === "boolean") filter.isActive = query.isActive;

  if (query.categoryId) {
    const oid = toObjectId(query.categoryId);
    if (!oid) {
      return res.status(400).json({ ok: false, message: "Invalid categoryId" });
    }
    filter.categoryId = oid;
  }

  if (query.q) {
    const q = query.q.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { sku: { $regex: q, $options: "i" } },
      { barcode: { $regex: q, $options: "i" } },
      { categoryName: { $regex: q, $options: "i" } }
    ];
  }

  const limit = query.limit ?? 20;
  const page = query.page ?? 1;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter)
  ]);

  return res.json({ ok: true, page, limit, total, items });
}

export async function getProduct(req: Request, res: Response) {
  const shopId = getShopId(req);

  const id = (req.params as any).id;
  if (typeof id !== "string" || !id) {
    return res.status(400).json({ ok: false, message: "Missing product id" });
  }

  const oid = toObjectId(id);
  if (!oid) {
    return res.status(400).json({ ok: false, message: "Invalid product id" });
  }

  const product = await Product.findOne({ _id: oid, shopId });
  if (!product) {
    return res.status(404).json({ ok: false, message: "Product not found" });
  }

  return res.json({ ok: true, product });
}

export async function updateProduct(req: Request, res: Response) {
  const shopId = getShopId(req);

  const id = (req.params as any).id;
  if (typeof id !== "string" || !id) {
    return res.status(400).json({ ok: false, message: "Missing product id" });
  }

  const oid = toObjectId(id);
  if (!oid) {
    return res.status(400).json({ ok: false, message: "Invalid product id" });
  }

  const data = updateSchema.parse(req.body);
  const update: any = {};

  if (typeof data.name === "string") update.name = data.name.trim();
  if (typeof data.description === "string") update.description = data.description;

  if (typeof data.sku === "string") update.sku = data.sku.trim();
  if (typeof data.barcode === "string") update.barcode = data.barcode.trim();

  if (typeof data.unit === "string") update.unit = data.unit.trim();

  if (typeof data.costPrice === "number") update.costPrice = data.costPrice;
  if (typeof data.sellPrice === "number") update.sellPrice = data.sellPrice;

  if (typeof data.isActive === "boolean") update.isActive = data.isActive;

  if ("categoryId" in data) {
    const resolved = await resolveCategory(shopId, data.categoryId ?? null);
    update.categoryId = resolved.categoryId;
    update.categoryName = resolved.categoryName;
  }

  const product = await Product.findOneAndUpdate({ _id: oid, shopId }, update, { new: true });
  if (!product) {
    return res.status(404).json({ ok: false, message: "Product not found" });
  }

  return res.json({ ok: true, product });
}


export async function deleteProduct(req: Request, res: Response) {
  const shopId = getShopId(req);

  const id = (req.params as any).id;
  if (typeof id !== "string" || !id) {
    return res.status(400).json({ ok: false, message: "Missing product id" });
  }

  const oid = toObjectId(id);
  if (!oid) {
    return res.status(400).json({ ok: false, message: "Invalid product id" });
  }

  const product = await Product.findOneAndUpdate({ _id: oid, shopId }, { isActive: false }, { new: true });
  if (!product) {
    return res.status(404).json({ ok: false, message: "Product not found" });
  }

  return res.json({ ok: true, product });
}