import { Schema, model, type InferSchemaType } from "mongoose";

const ProductCategorySchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },

    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, index: true },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: "product_categories" }
);

// Unique per shop (case-insensitive via normalizedName)
ProductCategorySchema.index({ shopId: 1, normalizedName: 1 }, { unique: true });

export type ProductCategoryDoc = InferSchemaType<typeof ProductCategorySchema>;
export const ProductCategory = model("ProductCategory", ProductCategorySchema);