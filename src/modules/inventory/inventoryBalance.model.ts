import { Schema, model, type InferSchemaType } from "mongoose";

const InventoryBalanceSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    qtyOnHand: { type: Number, required: true, default: 0, min: 0 }
  },
  { timestamps: true, collection: "inventory_balances" }
);

InventoryBalanceSchema.index({ shopId: 1, productId: 1 }, { unique: true });

export type InventoryBalanceDoc = InferSchemaType<typeof InventoryBalanceSchema>;
export const InventoryBalance = model("InventoryBalance", InventoryBalanceSchema);