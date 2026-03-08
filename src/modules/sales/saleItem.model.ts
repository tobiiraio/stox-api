import { Schema, model, type InferSchemaType } from "mongoose";

const SaleItemSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: true, index: true },

    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productNameSnapshot: { type: String, required: true, trim: true },

    quantity: { type: Number, required: true, min: 1 },

    unitPrice: { type: Number, required: true, min: 0 },
    unitCostSnapshot: { type: Number, required: true, min: 0 },

    lineTotal: { type: Number, required: true, min: 0 },
    lineCost: { type: Number, required: true, min: 0 },
    lineProfit: { type: Number, required: true }
  },
  { timestamps: true, collection: "sale_items" }
);

SaleItemSchema.index({ shopId: 1, saleId: 1 });

export type SaleItemDoc = InferSchemaType<typeof SaleItemSchema>;
export const SaleItem = model("SaleItem", SaleItemSchema);