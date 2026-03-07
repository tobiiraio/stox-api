import { Schema, model, type InferSchemaType } from "mongoose";

const ShopSchema = new Schema(
  {
    shopId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export type ShopDoc = InferSchemaType<typeof ShopSchema>;
export const Shop = model("Shop", ShopSchema);