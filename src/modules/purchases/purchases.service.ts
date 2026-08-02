import { Types } from "mongoose";
import { z } from "zod";
import { Product } from "../products/product.model.js";
import { Purchase } from "./purchase.model.js";
import { PurchaseItem } from "./purchaseItem.model.js";
import { applyStockChange } from "../inventory/inventory.service.js";
import { Supplier } from "../suppliers/supplier.model.js";

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

const purchaseItemInputSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  isPackPurchase: z.boolean().optional()
});

const createPurchaseSchema = z.object({
  supplierId: z.string().optional().nullable(),
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
    variantId: Types.ObjectId | null;
    quantity: number;          // sell-unit quantity (already multiplied if pack purchase)
    unitCost: number;
    lineTotal: number;
    packsOrdered: number | null;
    packSizeSnapshot: number;
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

    const variantOid = item.variantId ? toObjectId(item.variantId) : null;

    // Pack conversion logic
    let sellQuantity = item.quantity;
    let packsOrdered: number | null = null;
    let packSizeSnapshot = 1;

    const productPackSize = product.packSize ?? 1;

    if (item.isPackPurchase === true && productPackSize > 1) {
      packsOrdered = item.quantity;
      packSizeSnapshot = productPackSize;
      sellQuantity = item.quantity * productPackSize;
    }

    preparedItems.push({
      productId: oid,
      productNameSnapshot: product.name,
      variantId: variantOid,
      quantity: sellQuantity,
      unitCost: item.unitCost,
      lineTotal: sellQuantity * item.unitCost,
      packsOrdered,
      packSizeSnapshot
    });
  }

  const totalAmount = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  // Resolve supplier name from supplierId if provided
  let supplierId: Types.ObjectId | null = null;
  let supplierName = input.supplierName ?? "";
  if (input.supplierId) {
    const soid = toObjectId(input.supplierId);
    if (soid) {
      const supplier = await Supplier.findOne({ _id: soid, shopId });
      if (supplier) {
        supplierId = soid;
        supplierName = supplier.name;
      }
    }
  }

  const purchase = await Purchase.create({
    shopId,
    supplierId,
    supplierName,
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
      variantId: item.variantId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: item.lineTotal,
      packsOrdered: item.packsOrdered,
      packSizeSnapshot: item.packSizeSnapshot
    }))
  );

  for (const item of preparedItems) {
    await applyStockChange({
      shopId,
      productId: String(item.productId),
      variantId: item.variantId ? String(item.variantId) : null,
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
