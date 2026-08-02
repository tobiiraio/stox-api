import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Supplier } from "./supplier.model.js";

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
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional()
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional()
});

export async function listSuppliers(req: Request, res: Response) {
  const shopId = getShopId(req);
  const q = (req.query as any).q as string | undefined;

  const filter: any = { shopId, isActive: true };
  if (q) filter.name = { $regex: q.trim(), $options: "i" };

  const suppliers = await Supplier.find(filter).sort({ name: 1 });
  return res.json({ ok: true, items: suppliers });
}

export async function createSupplier(req: Request, res: Response) {
  const shopId = getShopId(req);
  const data = createSchema.parse(req.body);

  const existing = await Supplier.findOne({ shopId, name: new RegExp(`^${data.name.trim()}$`, "i"), isActive: true });
  if (existing) {
    return res.status(409).json({ ok: false, message: "A supplier with this name already exists" });
  }

  const supplier = await Supplier.create({
    shopId,
    name: data.name.trim(),
    phone: data.phone?.trim() ?? "",
    email: data.email?.trim() ?? "",
    notes: data.notes?.trim() ?? ""
  });

  return res.status(201).json({ ok: true, supplier });
}

export async function updateSupplier(req: Request, res: Response) {
  const shopId = getShopId(req);
  const id = (req.params as any).id as string;

  const oid = toObjectId(id);
  if (!oid) return res.status(400).json({ ok: false, message: "Invalid supplier id" });

  const data = updateSchema.parse(req.body);
  const update: any = {};
  if (typeof data.name === "string") update.name = data.name.trim();
  if (typeof data.phone === "string") update.phone = data.phone.trim();
  if (typeof data.email === "string") update.email = data.email.trim();
  if (typeof data.notes === "string") update.notes = data.notes.trim();
  if (typeof data.isActive === "boolean") update.isActive = data.isActive;

  const supplier = await Supplier.findOneAndUpdate({ _id: oid, shopId }, update, { new: true });
  if (!supplier) return res.status(404).json({ ok: false, message: "Supplier not found" });

  return res.json({ ok: true, supplier });
}

export async function deleteSupplier(req: Request, res: Response) {
  const shopId = getShopId(req);
  const id = (req.params as any).id as string;

  const oid = toObjectId(id);
  if (!oid) return res.status(400).json({ ok: false, message: "Invalid supplier id" });

  const supplier = await Supplier.findOneAndUpdate({ _id: oid, shopId }, { isActive: false }, { new: true });
  if (!supplier) return res.status(404).json({ ok: false, message: "Supplier not found" });

  return res.json({ ok: true });
}
