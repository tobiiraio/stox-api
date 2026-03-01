import { Schema, model, type InferSchemaType } from "mongoose";

export type UserRole = "OWNER" | "ADMIN" | "STAFF";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    shopId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ["OWNER", "ADMIN", "STAFF"], default: "STAFF" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// unique per tenant
UserSchema.index({ shopId: 1, email: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User = model("User", UserSchema);