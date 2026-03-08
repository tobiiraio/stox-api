import { Schema, model, type InferSchemaType } from "mongoose";

export const STOCK_MOVEMENT_TYPES = ["PURCHASE", "SALE", "ADJUST_IN", "ADJUST_OUT"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

const StockMovementSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },

    type: {
      type: String,
      required: true,
      enum: STOCK_MOVEMENT_TYPES,
      index: true
    },

    quantity: { type: Number, required: true },
    qtyBefore: { type: Number, required: true, min: 0 },
    qtyAfter: { type: Number, required: true, min: 0 },

    referenceType: { type: String, default: "", trim: true },
    referenceId: { type: String, default: "", trim: true },

    note: { type: String, default: "", trim: true }
  },
  { timestamps: true, collection: "stock_movements" }
);

StockMovementSchema.index({ shopId: 1, productId: 1, createdAt: -1 });

export type StockMovementDoc = InferSchemaType<typeof StockMovementSchema>;
export const StockMovement = model("StockMovement", StockMovementSchema);