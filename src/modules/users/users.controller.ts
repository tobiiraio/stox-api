import type { Request, Response } from "express";
import { z } from "zod";
import { User, type UserRole } from "./user.model.js";
import { Shop } from "../shops/shop.model.js";
import { sendMail } from "../../config/mail.js";
import { staffAddedEmailTemplate } from "../notifications/templates/staff-added.template.js";

const roleSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"])
});

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

export async function listUsers(req: Request, res: Response) {
  const authed: any = req;
  const shopId = authed.user?.shopId as string;
  if (!shopId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const users = await User.find({ shopId }).sort({ createdAt: 1 }).lean();

  return res.json({
    ok: true,
    items: users.map((u) => ({
      id: String(u._id),
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      shopId: u.shopId,
      createdAt: (u as any).createdAt,
      updatedAt: (u as any).updatedAt,
    }))
  });
}

export async function deactivateUser(req: Request, res: Response) {
  const authed: any = req;
  const shopId = authed.user?.shopId as string;
  const requestingSub = authed.user?.sub as string;
  if (!shopId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const userId = (req.params as Record<string, string | undefined>)["userId"];
  if (!userId) return res.status(400).json({ ok: false, message: "Missing userId" });
  const user = await User.findOne({ _id: userId, shopId });
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });

  if (String(user._id) === requestingSub) {
    return res.status(400).json({ ok: false, message: "Cannot deactivate yourself" });
  }
  if (user.role === "OWNER") {
    return res.status(403).json({ ok: false, message: "Cannot deactivate the shop owner" });
  }

  user.isActive = false;
  await user.save();

  return res.json({ ok: true, message: "User deactivated" });
}

export async function updateUserRole(req: Request, res: Response) {
  const authed: any = req;
  const shopId = authed.user?.shopId as string;
  const requestingSub = authed.user?.sub as string;
  if (!shopId) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const userId = (req.params as Record<string, string | undefined>)["userId"];
  if (!userId) return res.status(400).json({ ok: false, message: "Missing userId" });
  const { role } = roleSchema.parse(req.body);

  const user = await User.findOne({ _id: userId, shopId });
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });

  if (String(user._id) === requestingSub) {
    return res.status(400).json({ ok: false, message: "Cannot change your own role" });
  }
  if (user.role === "OWNER") {
    return res.status(403).json({ ok: false, message: "Cannot change the owner's role" });
  }

  user.role = role as UserRole;
  await user.save();

  return res.json({ ok: true, user: { id: String(user._id), email: user.email, role: user.role } });
}