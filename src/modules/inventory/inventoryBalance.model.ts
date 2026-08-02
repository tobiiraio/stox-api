import { Schema, model, type InferSchemaType } from "mongoose";

const InventoryBalanceSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: "Variant", default: null },
    qtyOnHand: { type: Number, required: true, default: 0, min: 0 }
  },
  { timestamps: true, collection: "inventory_balances" }
);

// Non-unique compound index — uniqueness enforced via upsert keyed on { shopId, productId, variantId }
InventoryBalanceSchema.index({ shopId: 1, productId: 1, variantId: 1 });

export type InventoryBalanceDoc = InferSchemaType<typeof InventoryBalanceSchema>;
export const InventoryBalance = model("InventoryBalance", InventoryBalanceSchema);
