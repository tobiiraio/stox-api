import type { Request, Response } from "express";
import { z } from "zod";
import { User, type UserRole } from "./user.model.js";
import { Shop } from "../shops/shop.model.js";
import { sendMail } from "../../config/mail.js";
import { staffAddedEmailTemplate } from "../notifications/templates/staff-added.template.js";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF")
});

export async function inviteUser(req: Request, res: Response) {
  const { email, role } = inviteSchema.parse(req.body);
  const invitedEmail = email.toLowerCase();

  const authed: any = req; // will be AuthedRequest at runtime
  const shopId = authed.user?.shopId as string;
  if (!shopId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const shop = await Shop.findOne({ shopId, isActive: true });
  if (!shop) return res.status(404).json({ ok: false, message: "Shop not found or inactive" });

  const user = await User.findOneAndUpdate(
    { shopId, email: invitedEmail },
    { $set: { role: role as UserRole, isActive: true }, $setOnInsert: { shopId, email: invitedEmail } },
    { upsert: true, new: true }
  );

  // Email notification (don’t block the response if mail fails)
  try {
    const tpl = staffAddedEmailTemplate({
      shopName: shop.name,
      shopId: shop.shopId,
      invitedEmail
    });
    await sendMail(invitedEmail, tpl.subject, tpl.html, tpl.text);
  } catch (e) {
    console.error("Invite email failed:", e);
  }

  return res.status(201).json({
    ok: true,
    user: { id: String(user._id), email: user.email, role: user.role, shopId: user.shopId }
  });
}