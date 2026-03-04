import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const ProductSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },

    // Optional client-facing identifiers
    sku: { type: String, default: "", trim: true },
    barcode: { type: String, default: "", trim: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // Category (optional)
    categoryId: { type: Schema.Types.ObjectId, ref: "ProductCategory", default: null },
    categoryName: { type: String, default: "", trim: true }, // snapshot for fast UI/reporting

    unit: { type: String, default: "pcs", trim: true },

    costPrice: { type: Number, default: 0 },
    sellPrice: { type: Number, required: true },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: "products" }
);

// Optional uniqueness (only when non-empty)
ProductSchema.index(
  { shopId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: "string", $ne: "" } } }
);

ProductSchema.index(
  { shopId: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: "string", $ne: "" } } }
);

ProductSchema.index({ shopId: 1, name: 1 });
ProductSchema.index({ shopId: 1, categoryId: 1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id: Types.ObjectId;
};
export const Product = model("Product", ProductSchema);