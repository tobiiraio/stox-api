import { Types } from "mongoose";
import { z } from "zod";
import { Product } from "../products/product.model.js";
import { InventoryBalance } from "../inventory/inventoryBalance.model.js";
import { applyStockChange } from "../inventory/inventory.service.js";
import { Sale } from "./sale.model.js";
import { SaleItem } from "./saleItem.model.js";

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

const saleItemInputSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0).optional()
});

const createSaleSchema = z.object({
  customerName: z.string().max(120).optional(),
  customerPhone: z.string().max(40).optional(),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY", "CARD"]),
  soldAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(saleItemInputSchema).min(1)
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export function parseCreateSaleInput(input: unknown) {
  return createSaleSchema.parse(input);
}

function generateSaleNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SAL-${y}${m}${d}-${rand}`;
}

export async function createSaleWithItems(shopId: string, input: CreateSaleInput) {
  const soldAt = input.soldAt ? new Date(input.soldAt) : new Date();

  const preparedItems: Array<{
    productId: Types.ObjectId;
    productNameSnapshot: string;
    quantity: number;
    unitPrice: number;
    unitCostSnapshot: number;
    lineTotal: number;
    lineCost: number;
    lineProfit: number;
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

    const balance = await InventoryBalance.findOne({ shopId, productId: oid });
    const qtyOnHand = balance?.qtyOnHand ?? 0;

    if (qtyOnHand < item.quantity) {
      const err: any = new Error(`Insufficient stock for ${product.name}`);
      err.statusCode = 400;
      throw err;
    }

    const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : product.sellPrice;
    const unitCostSnapshot = product.costPrice ?? 0;

    const lineTotal = unitPrice * item.quantity;
    const lineCost = unitCostSnapshot * item.quantity;
    const lineProfit = lineTotal - lineCost;

    preparedItems.push({
      productId: oid,
      productNameSnapshot: product.name,
      quantity: item.quantity,
      unitPrice,
      unitCostSnapshot,
      lineTotal,
      lineCost,
      lineProfit
    });
  }

  const totalAmount = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalCost = preparedItems.reduce((sum, item) => sum + item.lineCost, 0);
  const grossProfit = totalAmount - totalCost;

  let saleNumber = generateSaleNumber();
  while (await Sale.findOne({ shopId, saleNumber })) {
    saleNumber = generateSaleNumber();
  }

  const sale = await Sale.create({
    shopId,
    saleNumber,
    customerName: input.customerName ?? "",
    customerPhone: input.customerPhone ?? "",
    paymentMethod: input.paymentMethod,
    totalAmount,
    totalCost,
    grossProfit,
    soldAt,
    notes: input.notes ?? ""
  });

  const saleItems = await SaleItem.insertMany(
    preparedItems.map((item) => ({
      shopId,
      saleId: sale._id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCostSnapshot: item.unitCostSnapshot,
      lineTotal: item.lineTotal,
      lineCost: item.lineCost,
      lineProfit: item.lineProfit
    }))
  );

  for (const item of preparedItems) {
    await applyStockChange({
      shopId,
      productId: String(item.productId),
      type: "SALE",
      quantity: item.quantity,
      referenceType: "SALE",
      referenceId: String(sale._id),
      note: input.notes ?? ""
    });
  }

  return { sale, items: saleItems };
}