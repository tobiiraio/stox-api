import { Types } from "mongoose";
import { z } from "zod";
import { Product } from "../products/product.model.js";
import { Purchase } from "./purchase.model.js";
import { PurchaseItem } from "./purchaseItem.model.js";
import { applyStockChange } from "../inventory/inventory.service.js";

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

const purchaseItemInputSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0)
});

const createPurchaseSchema = z.object({
  supplierName: z.string().max(120).optional(),
  invoiceNumber: z.string().max(80).optional(),
  purchasedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(purchaseItemInputSchema).min(1)
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export function parseCreatePurchaseInput(input: unknown) {
  return createPurchaseSchema.parse(input);
}

export async function createPurchaseWithItems(shopId: string, input: CreatePurchaseInput) {
  const purchasedAt = input.purchasedAt ? new Date(input.purchasedAt) : new Date();

  const preparedItems: Array<{
    productId: Types.ObjectId;
    productNameSnapshot: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
  }> = [];

  for (const item of input.items) {
    const oid = toObjectId(item.productId);
    if (!oid) {
      const err: any = new Error(`Invalid productId: ${item.productId}`);
      err.statusCode = 400;
      throw err;
    }

    const product = await Product.findOne({ _id: oid, shopId, isActive: true });
    if (!product) {
      const err: any = new Error(`Product not found or inactive: ${item.productId}`);
      err.statusCode = 404;
      throw err;
    }

    preparedItems.push({
      productId: oid,
      productNameSnapshot: product.name,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: item.quantity * item.unitCost
    });
  }

  const totalAmount = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const purchase = await Purchase.create({
    shopId,
    supplierName: input.supplierName ?? "",
    invoiceNumber: input.invoiceNumber ?? "",
    totalAmount,
    purchasedAt,
    notes: input.notes ?? ""
  });

  const purchaseItems = await PurchaseItem.insertMany(
    preparedItems.map((item) => ({
      shopId,
      purchaseId: purchase._id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: item.lineTotal
    }))
  );

  for (const item of preparedItems) {
    await applyStockChange({
      shopId,
      productId: String(item.productId),
      type: "PURCHASE",
      quantity: item.quantity,
      referenceType: "PURCHASE",
      referenceId: String(purchase._id),
      note: input.notes ?? ""
    });

    await Product.updateOne(
      { _id: item.productId, shopId },
      { $set: { costPrice: item.unitCost } }
    );
  }

  return { purchase, items: purchaseItems };
}