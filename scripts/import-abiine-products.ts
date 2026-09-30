import fs from "node:fs";
import mongoose from "mongoose";

import { connectDb } from "../src/config/db.js";
import { Shop } from "../src/modules/shops/shop.model.js";
import { Product } from "../src/modules/products/product.model.js";
import { InventoryBalance } from "../src/modules/inventory/inventoryBalance.model.js";
import { StockMovement } from "../src/modules/inventory/stockMovement.model.js";

type ParsedItem = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  openingStock: number;
};

const TARGET_SHOP_ID = "stx_Jx1lx0oX";
const JSON_PATH = process.argv[2] ?? "/tmp/abiine-products.json";

async function main() {
  await connectDb();
  console.log(`Connected to DB: ${mongoose.connection.name}`);

  const shop = await Shop.findOne({ shopId: TARGET_SHOP_ID });
  if (!shop) {
    throw new Error(`Shop ${TARGET_SHOP_ID} not found.`);
  }
  if (!shop.isActive) {
    throw new Error(`Shop ${TARGET_SHOP_ID} is not active.`);
  }
  console.log(`Shop: ${shop.shopId} (${shop.name})`);

  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  const items = JSON.parse(raw) as ParsedItem[];
  console.log(`Loaded ${items.length} items from ${JSON_PATH}`);

  let created = 0;
  let skipped = 0;
  let stockSeeded = 0;

  for (const it of items) {
    if (!it.name || !(it.sellPrice > 0)) {
      console.log(`  SKIP (no name or price): ${JSON.stringify(it)}`);
      skipped++;
      continue;
    }

    const existing = await Product.findOne({
      shopId: shop.shopId,
      $or: [{ sku: it.sku }, { name: it.name }],
    });
    if (existing) {
      console.log(`  SKIP (exists): ${it.name} sku=${it.sku}`);
      skipped++;
      continue;
    }

    const product = await Product.create({
      shopId: shop.shopId,
      name: it.name,
      description: "",
      sku: it.sku,
      barcode: it.barcode,
      categoryId: null,
      categoryName: "",
      unit: "pcs",
      sellUnit: "",
      purchaseUnit: "",
      packSize: 1,
      costPrice: it.costPrice,
      sellPrice: it.sellPrice,
      isActive: true,
    });
    created++;

    const opening = Math.max(0, Math.floor(it.openingStock));

    await InventoryBalance.create({
      shopId: shop.shopId,
      productId: product._id,
      variantId: null,
      qtyOnHand: opening,
    });

    if (opening > 0) {
      await StockMovement.create({
        shopId: shop.shopId,
        productId: product._id,
        type: "ADJUST_IN",
        quantity: opening,
        qtyBefore: 0,
        qtyAfter: opening,
        referenceType: "IMPORT",
        referenceId: "loyverse-export-2026-09-30",
        note: "Opening balance (import from Loyverse)",
      });
      stockSeeded++;
    }

    console.log(`  OK: ${product.name}  sku=${it.sku}  price=${it.sellPrice}  stock=${opening}`);
  }

  console.log(`\nDone. created=${created} skipped=${skipped} stockSeeded=${stockSeeded}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
