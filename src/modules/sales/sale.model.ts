import { Schema, model, type InferSchemaType } from "mongoose";

export const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "CARD"] as const;

const SaleSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },

    saleNumber: { type: String, required: true, trim: true, index: true },

    customerName: { type: String, default: "", trim: true },
    customerPhone: { type: String, default: "", trim: true },

    paymentMethod: {
      type: String,
      required: true,
      enum: PAYMENT_METHODS
    },

    totalAmount: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    grossProfit: { type: Number, required: true },

    soldAt: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: "", trim: true }
  },
  { timestamps: true, collection: "sales" }
);

SaleSchema.index({ shopId: 1, saleNumber: 1 }, { unique: true });
SaleSchema.index({ shopId: 1, soldAt: -1 });

export type SaleDoc = InferSchemaType<typeof SaleSchema>;
export const Sale = model("Sale", SaleSchema);