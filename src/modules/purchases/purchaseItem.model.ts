import { Schema, model, type InferSchemaType } from "mongoose";

const PurchaseItemSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", required: true, index: true },

    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productNameSnapshot: { type: String, required: true, trim: true },

    variantId: { type: Schema.Types.ObjectId, ref: "Variant", default: null },

    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },

    // Pack conversion fields
    packsOrdered: { type: Number, default: null },      // how many packs were ordered (null = no pack conversion)
    packSizeSnapshot: { type: Number, default: 1 }      // packSize at time of purchase (1 = no conversion)
  },
  { timestamps: true, collection: "purchase_items" }
);

PurchaseItemSchema.index({ shopId: 1, purchaseId: 1 });

export type PurchaseItemDoc = InferSchemaType<typeof PurchaseItemSchema>;
export const PurchaseItem = model("PurchaseItem", PurchaseItemSchema);
