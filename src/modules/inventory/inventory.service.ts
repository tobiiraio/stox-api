import { Types } from "mongoose";
import { InventoryBalance } from "./inventoryBalance.model.js";
import { StockMovement, type StockMovementType } from "./stockMovement.model.js";
import { Product } from "../products/product.model.js";

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

export async function ensureInventoryBalance(shopId: string, productId: string) {
  const oid = toObjectId(productId);
  if (!oid) {
    const err: any = new Error("Invalid productId");
    err.statusCode = 400;
    throw err;
  }

  const product = await Product.findOne({ _id: oid, shopId });
  if (!product) {
    const err: any = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  const balance = await InventoryBalance.findOneAndUpdate(
    { shopId, productId: oid },
    { $setOnInsert: { shopId, productId: oid, qtyOnHand: 0 } },
    { upsert: true, new: true }
  );

  return balance;
}

export async function applyStockChange(input: {
  shopId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  note?: string;
}) {
  const { shopId, productId, type, quantity, referenceType = "", referenceId = "", note = "" } = input;

  const oid = toObjectId(productId);
  if (!oid) {
    const err: any = new Error("Invalid productId");
    err.statusCode = 400;
    throw err;
  }

  const product = await Product.findOne({ _id: oid, shopId, isActive: true });
  if (!product) {
    const err: any = new Error("Product not found or inactive");
    err.statusCode = 404;
    throw err;
  }

  if (quantity <= 0) {
    const err: any = new Error("Quantity must be greater than zero");
    err.statusCode = 400;
    throw err;
  }

  const balance = await ensureInventoryBalance(shopId, productId);

  const isOut = type === "SALE" || type === "ADJUST_OUT";
  const signedQty = isOut ? -quantity : quantity;

  const qtyBefore = balance.qtyOnHand;
  const qtyAfter = qtyBefore + signedQty;

  if (qtyAfter < 0) {
    const err: any = new Error("Insufficient stock");
    err.statusCode = 400;
    throw err;
  }

  balance.qtyOnHand = qtyAfter;
  await balance.save();

  const movement = await StockMovement.create({
    shopId,
    productId: oid,
    type,
    quantity: signedQty,
    qtyBefore,
    qtyAfter,
    referenceType,
    referenceId,
    note
  });

  return { balance, movement };
}