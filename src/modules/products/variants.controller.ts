import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Variant } from "./variant.model.js";
import { Product } from "./product.model.js";

function getShopId(req: any): string {
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

const createVariantSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.enum(["SIZE", "COLOR", "OTHER"])
});

const updateVariantSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  type: z.enum(["SIZE", "COLOR", "OTHER"]).optional(),
  isActive: z.boolean().optional()
});

const listVariantsQuerySchema = z.object({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v !== undefined ? v === "true" : undefined))
});

export async function listVariants(req: Request, res: Response) {
  const shopId = getShopId(req);
  const productId = (req.params as any).productId as string;

  const oid = toObjectId(productId);
  if (!oid) {
    return res.status(400).json({ ok: false, message: "Invalid productId" });
  }

  const product = await Product.findOne({ _id: oid, shopId });
  if (!product) {
    return res.status(404).json({ ok: false, message: "Product not found" });
  }

  const query = listVariantsQuerySchema.parse(req.query);
  const filter: any = { shopId, productId: oid };
  if (typeof query.isActive === "boolean") filter.isActive = query.isActive;

  const variants = await Variant.find(filter).sort({ name: 1 });
  return res.json({ ok: true, variants });
}

export async function createVariant(req: Request, res: Response) {
  const shopId = getShopId(req);
  const productId = (req.params as any).productId as string;

  const oid = toObjectId(productId);
  if (!oid) {
    return res.status(400).json({ ok: false, message: "Invalid productId" });
  }

  const product = await Product.findOne({ _id: oid, shopId });
  if (!product) {
    return res.status(404).json({ ok: false, message: "Product not found" });
  }

  const data = createVariantSchema.parse(req.body);

  // Check for duplicate name
  const existing = await Variant.findOne({ shopId, productId: oid, name: data.name });
  if (existing) {
    return res.status(409).json({ ok: false, message: "Variant with this name already exists for this product" });
  }

  const variant = await Variant.create({
    shopId,
    productId: oid,
    name: data.name,
    type: data.type,
    isActive: true
  });

  return res.status(201).json({ ok: true, variant });
}

export async function updateVariant(req: Request, res: Response) {
  const shopId = getShopId(req);
  const productId = (req.params as any).productId as string;
  const variantId = (req.params as any).variantId as string;

  const productOid = toObjectId(productId);
  if (!productOid) {
    return res.status(400).json({ ok: false, message: "Invalid productId" });
  }

  const variantOid = toObjectId(variantId);
  if (!variantOid) {
    return res.status(400).json({ ok: false, message: "Invalid variantId" });
  }

  const data = updateVariantSchema.parse(req.body);
  const update: any = {};

  if (typeof data.name === "string") update.name = data.name;
  if (typeof data.type === "string") update.type = data.type;
  if (typeof data.isActive === "boolean") update.isActive = data.isActive;

  const variant = await Variant.findOneAndUpdate(
    { _id: variantOid, shopId, productId: productOid },
    update,
    { new: true }
  );

  if (!variant) {
    return res.status(404).json({ ok: false, message: "Variant not found" });
  }

  return res.json({ ok: true, variant });
}

export async function deleteVariant(req: Request, res: Response) {
  const shopId = getShopId(req);
  const productId = (req.params as any).productId as string;
  const variantId = (req.params as any).variantId as string;

  const productOid = toObjectId(productId);
  if (!productOid) {
    return res.status(400).json({ ok: false, message: "Invalid productId" });
  }

  const variantOid = toObjectId(variantId);
  if (!variantOid) {
    return res.status(400).json({ ok: false, message: "Invalid variantId" });
  }

  // Soft delete: set isActive = false
  const variant = await Variant.findOneAndUpdate(
    { _id: variantOid, shopId, productId: productOid },
    { isActive: false },
    { new: true }
  );

  if (!variant) {
    return res.status(404).json({ ok: false, message: "Variant not found" });
  }

  return res.json({ ok: true, variant });
}
