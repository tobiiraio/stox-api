import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const VariantSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["SIZE", "COLOR", "OTHER"]
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: "product_variants" }
);

VariantSchema.index({ shopId: 1, productId: 1, name: 1 }, { unique: true });

export type VariantDoc = InferSchemaType<typeof VariantSchema> & {
  _id: Types.ObjectId;
};
export const Variant = model("Variant", VariantSchema);
