import mongoose from "mongoose";

import { connectDb } from "../src/config/db.js";
import { Shop } from "../src/modules/shops/shop.model.js";
import { User } from "../src/modules/users/user.model.js";
import { Otp } from "../src/modules/auth/otp.model.js";
import { Product } from "../src/modules/products/product.model.js";
import { InventoryBalance } from "../src/modules/inventory/inventoryBalance.model.js";
import { StockMovement } from "../src/modules/inventory/stockMovement.model.js";

const OWNER_EMAIL = "abiinefitz@gmail.com";

async function main() {
  await connectDb();
  console.log(`DB: ${mongoose.connection.name}`);

  const users = await User.find({ email: OWNER_EMAIL }).lean();
  console.log(`\nUsers with email ${OWNER_EMAIL}: ${users.length}`);
  for (const u of users) {
    console.log(`  _id=${u._id}  shopId=${u.shopId}  role=${u.role}  isActive=${u.isActive}  createdAt=${u.createdAt}`);
  }

  const shopIds = users.map((u) => u.shopId);
  const shops = await Shop.find({ $or: [{ ownerEmail: OWNER_EMAIL }, { shopId: { $in: shopIds } }] }).lean();
  console.log(`\nShops: ${shops.length}`);
  for (const s of shops) {
    console.log(`  shopId=${s.shopId}  name="${s.name}"  ownerEmail=${s.ownerEmail}  isActive=${s.isActive}  createdAt=${s.createdAt}`);
  }

  const otps = await Otp.find({ email: OWNER_EMAIL }).sort({ createdAt: -1 }).limit(5).lean();
  console.log(`\nRecent OTPs (max 5): ${otps.length}`);
  for (const o of otps) {
    console.log(`  shopId=${o.shopId}  usedAt=${o.usedAt}  expiresAt=${o.expiresAt}  attempts=${o.attempts}  createdAt=${o.createdAt}`);
  }

  for (const s of shops) {
    const productCount = await Product.countDocuments({ shopId: s.shopId });
    const balanceCount = await InventoryBalance.countDocuments({ shopId: s.shopId });
    const movementCount = await StockMovement.countDocuments({ shopId: s.shopId });
    console.log(`\nShop ${s.shopId}: products=${productCount}  balances=${balanceCount}  movements=${movementCount}`);
    if (productCount > 0 && productCount <= 10) {
      const sample = await Product.find({ shopId: s.shopId }).limit(10).lean();
      for (const p of sample) {
        console.log(`  - ${p.name}  sku=${p.sku}  price=${p.sellPrice}`);
      }
    } else if (productCount > 10) {
      const sample = await Product.find({ shopId: s.shopId }).limit(5).lean();
      console.log(`  (first 5)`);
      for (const p of sample) {
        console.log(`    - ${p.name}  sku=${p.sku}  price=${p.sellPrice}`);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
