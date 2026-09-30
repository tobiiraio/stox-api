import mongoose from "mongoose";

import { connectDb } from "../src/config/db.js";
import { Shop } from "../src/modules/shops/shop.model.js";
import { User } from "../src/modules/users/user.model.js";
import { Otp } from "../src/modules/auth/otp.model.js";

const KEEP_SHOP_ID = "stx_Jx1lx0oX";
const NEW_NAME = "Abiine Fashion Vault";
const STALE_SHOP_IDS = ["stx_ljg93wT9", "stx_iBmW1mBT", "stx_ubOW3mgn"];
const OWNER_EMAIL = "abiinefitz@gmail.com";

async function main() {
  await connectDb();
  console.log(`DB: ${mongoose.connection.name}`);

  const keep = await Shop.findOne({ shopId: KEEP_SHOP_ID });
  if (!keep) throw new Error(`Kept shop ${KEEP_SHOP_ID} not found`);
  const oldName = keep.name;
  keep.name = NEW_NAME;
  await keep.save();
  console.log(`Renamed ${KEEP_SHOP_ID}: "${oldName}" -> "${NEW_NAME}"`);

  for (const sid of STALE_SHOP_IDS) {
    const shop = await Shop.findOne({ shopId: sid });
    if (!shop) {
      console.log(`  ${sid}: shop not found (already removed?)`);
      continue;
    }
    if (shop.isActive) {
      console.log(`  ${sid}: is ACTIVE, refusing to delete`);
      continue;
    }
    const userRes = await User.deleteMany({ shopId: sid, email: OWNER_EMAIL });
    const otpRes = await Otp.deleteMany({ shopId: sid });
    await Shop.deleteOne({ shopId: sid });
    console.log(`  ${sid}: deleted shop, users=${userRes.deletedCount}, otps=${otpRes.deletedCount}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
