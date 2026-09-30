import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { env } from "../src/config/env.js";
import { connectDb } from "../src/config/db.js";
import { sendMail } from "../src/config/mail.js";
import { Shop } from "../src/modules/shops/shop.model.js";
import { User } from "../src/modules/users/user.model.js";
import { Otp } from "../src/modules/auth/otp.model.js";
import { otpEmailTemplate } from "../src/modules/notifications/templates/otp.template.js";

const OWNER_EMAIL = "abiinefitz@gmail.com";
const TARGET_SHOP_ID = "stx_Jx1lx0oX";
const SEND_EMAIL = true;

function generateNumericOtp(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

async function main() {
  await connectDb();
  console.log(`DB: ${mongoose.connection.name}`);

  const email = OWNER_EMAIL.toLowerCase();

  const shop = await Shop.findOne({ shopId: TARGET_SHOP_ID });
  if (!shop) throw new Error(`Shop ${TARGET_SHOP_ID} not found`);
  if (!shop.isActive) throw new Error(`Shop ${TARGET_SHOP_ID} is not active`);

  const user = await User.findOne({ email, shopId: TARGET_SHOP_ID });
  if (!user) throw new Error(`User ${email} not found on shop ${TARGET_SHOP_ID}`);
  if (!user.isActive) throw new Error(`User ${email} on shop ${TARGET_SHOP_ID} is not active`);

  const code = generateNumericOtp(env.otp.length);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60_000);

  await Otp.updateMany(
    { email, shopId: TARGET_SHOP_ID, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  await Otp.create({
    email,
    shopId: TARGET_SHOP_ID,
    codeHash,
    expiresAt,
    attempts: 0,
    usedAt: null,
  });

  console.log("\n=========================================");
  console.log(`Shop:       ${shop.shopId}  ("${shop.name}")`);
  console.log(`User:       ${user.email}  (role=${user.role})`);
  console.log(`OTP code:   ${code}`);
  console.log(`Expires at: ${expiresAt.toISOString()}  (${env.otp.ttlMinutes} min)`);
  console.log("=========================================\n");

  if (SEND_EMAIL) {
    try {
      const tpl = otpEmailTemplate({
        code,
        ttlMinutes: env.otp.ttlMinutes,
        shopName: shop.name,
        purpose: "login",
      });
      await sendMail(email, tpl.subject, tpl.html, tpl.text);
      console.log(`OTP email sent to ${email} via Brevo.`);
    } catch (mailErr) {
      console.error(`Failed to send OTP email:`, mailErr);
    }
  }

  console.log(`\nVerify with POST /api/auth/otp/verify:`);
  console.log(`  { "email": "${email}", "shopId": "${TARGET_SHOP_ID}", "code": "${code}" }`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
