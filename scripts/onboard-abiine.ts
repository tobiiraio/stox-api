import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { nanoid } from "nanoid";

import { env } from "../src/config/env.js";
import { connectDb } from "../src/config/db.js";
import { sendMail } from "../src/config/mail.js";
import { Shop } from "../src/modules/shops/shop.model.js";
import { User } from "../src/modules/users/user.model.js";
import { Otp } from "../src/modules/auth/otp.model.js";
import { otpEmailTemplate } from "../src/modules/notifications/templates/otp.template.js";

const SHOP_NAME = "Abiine Fashion Vault";
const OWNER_EMAIL = "abiinefitz@gmail.com";
const SEND_EMAIL = true;

function generateNumericOtp(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

async function main() {
  await connectDb();
  const dbName = mongoose.connection.name;
  console.log(`\nConnected to DB: ${dbName}`);
  if (!dbName.toUpperCase().includes("PROD")) {
    console.log(`Warning: DB name does not contain PROD — continuing anyway.`);
  }

  const email = OWNER_EMAIL.toLowerCase();

  const existingUser = await User.findOne({ email, role: "OWNER" });
  if (existingUser) {
    console.log(`\nOwner user already exists for ${email} on shopId=${existingUser.shopId}. Aborting to avoid duplicate onboarding.`);
    console.log(`If you need a fresh onboarding, delete the existing Shop + User + Otp records first.`);
    await mongoose.disconnect();
    return;
  }

  const shopId = `stx_${nanoid(8)}`;
  const shop = await Shop.create({
    shopId,
    name: SHOP_NAME,
    ownerEmail: email,
    isActive: false,
  });

  const owner = await User.create({
    shopId,
    email,
    role: "OWNER",
    isActive: false,
  });

  const code = generateNumericOtp(env.otp.length);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60_000);

  await Otp.create({
    email,
    shopId,
    codeHash,
    expiresAt,
    attempts: 0,
    usedAt: null,
  });

  console.log("\n=========================================");
  console.log(`Shop created:  ${shop.shopId}  (${shop.name})`);
  console.log(`Owner user:    ${owner.email}  (role=OWNER, isActive=false)`);
  console.log(`OTP code:      ${code}`);
  console.log(`Expires at:    ${expiresAt.toISOString()}  (${env.otp.ttlMinutes} min)`);
  console.log("=========================================\n");

  if (SEND_EMAIL) {
    try {
      const tpl = otpEmailTemplate({
        code,
        ttlMinutes: env.otp.ttlMinutes,
        shopName: shop.name,
        purpose: "verification",
      });
      await sendMail(email, tpl.subject, tpl.html, tpl.text);
      console.log(`OTP email sent to ${email} via Brevo.`);
    } catch (mailErr) {
      console.error(`Failed to send OTP email:`, mailErr);
      console.log(`OTP code above is still valid — user can verify with it.`);
    }
  }

  console.log(`\nNext step: verify OTP via POST /api/auth/otp/verify with:`);
  console.log(`  { "email": "${email}", "shopId": "${shopId}", "code": "${code}" }`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
