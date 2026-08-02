import { Schema, model, type InferSchemaType } from "mongoose";

const SupplierSchema = new Schema(
  {
    shopId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    notes: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: "suppliers" }
);

SupplierSchema.index({ shopId: 1, name: 1 });

export type SupplierDoc = InferSchemaType<typeof SupplierSchema>;
export const Supplier = model("Supplier", SupplierSchema);
