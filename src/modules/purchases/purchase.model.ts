import { Schema, model, type InferSchemaType } from "mongoose";

const PurchaseSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },

    supplierName: { type: String, default: "", trim: true },
    invoiceNumber: { type: String, default: "", trim: true },

    totalAmount: { type: Number, required: true, min: 0 },

    purchasedAt: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: "", trim: true }
  },
  { timestamps: true, collection: "purchases" }
);

PurchaseSchema.index({ shopId: 1, purchasedAt: -1 });

export type PurchaseDoc = InferSchemaType<typeof PurchaseSchema>;
export const Purchase = model("Purchase", PurchaseSchema);