import { Schema, model, type InferSchemaType } from "mongoose";

const ShopSchema = new Schema(
  {
    shopId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: false },
    phone: { type: String, default: '' },
    country: { type: String, default: 'Uganda' },
    currencyCode: { type: String, default: 'UGX' },
    currencySymbol: { type: String, default: 'UGX' }
  },
  { timestamps: true }
);

export type ShopDoc = InferSchemaType<typeof ShopSchema>;
export const Shop = model("Shop", ShopSchema);