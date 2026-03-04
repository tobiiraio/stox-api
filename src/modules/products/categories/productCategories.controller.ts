import type { Request, Response } from "express";
import { z } from "zod";
import { ProductCategory } from "./productCategory.model.js";

function getShopId(req: any) {
  const shopId = req.user?.shopId;
  if (!shopId) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return shopId as string;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const createSchema = z.object({
  name: z.string().min(2).max(60)
});

const updateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  isActive: z.boolean().optional()
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v ? v === "true" : undefined))
});

export async function createProductCategory(req: Request, res: Response) {
  const shopId = getShopId(req);
  const { name } = createSchema.parse(req.body);

  const category = await ProductCategory.create({
    shopId,
    name: name.trim(),
    normalizedName: normalizeName(name),
    isActive: true
  });

  res.status(201).json({ ok: true, category });
}

export async function listProductCategories(req: Request, res: Response) {
  const shopId = getShopId(req);
  const query = listQuerySchema.parse(req.query);

  const filter: any = { shopId };
  if (typeof query.isActive === "boolean") filter.isActive = query.isActive;

  if (query.q) {
    const q = query.q.trim();
    filter.name = { $regex: q, $options: "i" };
  }

  const items = await ProductCategory.find(filter).sort({ name: 1 });
  res.json({ ok: true, items });
}

export async function getProductCategory(req: Request, res: Response) {
  const shopId = getShopId(req);
  const id = req.params.id;

  const category = await ProductCategory.findOne({ _id: id, shopId });
  if (!category) {
    return res.status(404).json({ ok: false, message: "Category not found" });
  }

  return res.json({ ok: true, category });
}

export async function updateProductCategory(req: Request, res: Response) {
  const shopId = getShopId(req);
  const id = req.params.id;

  const data = updateSchema.parse(req.body);

  const update: any = { ...data };
  if (typeof data.name === "string") {
    update.name = data.name.trim();
    update.normalizedName = normalizeName(data.name);
  }

  const category = await ProductCategory.findOneAndUpdate({ _id: id, shopId }, update, { new: true });
  if (!category) {
    return res.status(404).json({ ok: false, message: "Category not found" });
  }

  return res.json({ ok: true, category });
}

export async function deleteProductCategory(req: Request, res: Response) {
  const shopId = getShopId(req);
  const id = req.params.id;

  const category = await ProductCategory.findOneAndUpdate(
    { _id: id, shopId },
    { isActive: false },
    { new: true }
  );

  if (!category) {
    return res.status(404).json({ ok: false, message: "Category not found" });
  }

  return res.json({ ok: true, category });
}