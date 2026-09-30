import mongoose from "mongoose";

import { connectDb } from "../src/config/db.js";
import { Product } from "../src/modules/products/product.model.js";
import { ProductCategory } from "../src/modules/products/categories/productCategory.model.js";

const TARGET_SHOP_ID = "stx_Jx1lx0oX";
const DRY_RUN = process.argv.includes("--apply") ? false : true;

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Explicit SKU -> Category mapping (SKUs come from the Loyverse export)
const SKU_TO_CATEGORY: Record<string, string> = {
  // Socks (merged into Accessories)
  "10054": "Accessories",   // Ankle Socks
  "10001": "Accessories",   // Head socks
  "10002": "Accessories",   // Morcasiines Sock
  "10055": "Accessories",   // Long stockings

  // Jackets
  "10029": "Outerwear",       // Armless jackets
  "10039": "Outerwear",       // Causal jackets
  "10038": "Outerwear",       // Premium jackets

  // Shirts
  "10027": "Tops",        // Armless shirts
  "10023": "Tops",        // Big size short sleeves shirts
  "10020": "Tops",        // Causal shirts long
  "10021": "Tops",        // Causual shirts short
  "10018": "Tops",        // Office shirts long
  "10019": "Tops",        // Premium office shirts long
  "10051": "Tops",        // Sweater shirts
  "10045": "Tops",        // Gym shirts
  "10060": "Tops",        // Jerseys

  // T-Shirts
  "10024": "Tops",      // Collared tshirts
  "10077": "Tops",      // Collared tshirts premium
  "10025": "Tops",      // Long sleeves tshirts
  "10022": "Tops",      // Round neck tshirts
  "10071": "Tops",      // Round neck tshirts premium

  // Pants
  "10053": "Pants",         // Cargo pants
  "10043": "Pants",         // Cargo pants premium
  "10033": "Pants",         // Causal pants
  "10030": "Pants",         // Gym pants
  "10032": "Pants",         // Premium pants
  "10042": "Pants",         // Sweater pants

  // Jeans
  "10035": "Jeans",         // Causal jeans
  "10034": "Jeans",         // Premium jeans

  // Shorts
  "10048": "Shorts",        // Cargo shorts
  "10031": "Shorts",        // Jean shorts
  "10057": "Shorts",        // Linen shorts
  "10028": "Shorts",        // Material shorts

  // Blazers & Suits
  "10037": "Corporate", // Causal blazers
  "10036": "Corporate", // Premium blazers
  "10068": "Corporate", // Two piece

  // Sweaters
  "10014": "Outerwear",      // Causal sweaters
  "10056": "Outerwear",      // Lady sweaters
  "10046": "Outerwear",      // V/ R sweaters
  "10052": "Outerwear",      // New jampers
  "10058": "Outerwear",      // Premium jampers
  "10050": "Outerwear",      // S/H jampers
  "10041": "Outerwear",      // Pull neck
  "10044": "Outerwear",      // Quarter zippers

  // Undergarments — Vests
  "10026": "Undergarments", // Causal vests
  "10011": "Undergarments", // Moody Vests
  "10047": "Undergarments", // Sweater vests
  "10013": "Undergarments", // Undershirts
  "10012": "Undergarments", // Yarrison Vests

  // Undergarments — Boxers
  "10016": "Undergarments", // Brief boxers
  "10017": "Undergarments", // Normal boxers
  "10015": "Undergarments", // Premium boxers
  "10064": "Undergarments", // Yarrison boxers

  // Shoes
  "10066": "Shoes",         // Flats shoes
  "10067": "Shoes",         // Luofu shoes
  "10065": "Shoes",         // Sneaker shoes

  // Caps (merged into Accessories)
  "10000": "Accessories",   // Caps
  "10049": "Accessories",   // Kangaroo caps
  "10061": "Accessories",   // Premium caps
  "10076": "Accessories",   // Jo'boy cap

  // Belts (merged into Accessories)
  "10005": "Accessories",   // Belts
  "10063": "Accessories",   // Premium belts

  // Ties (merged into Accessories)
  "10007": "Accessories",   // Bow ties
  "10006": "Accessories",   // Neck Ties
  "10008": "Accessories",   // Ties clips

  // Wallets (merged into Accessories)
  "10004": "Accessories",   // Card wallets
  "10003": "Accessories",   // Money Wallets
  "10062": "Accessories",   // Premium wallets

  // Jewelry
  "10073": "Jewelry",       // Bracelets
  "10074": "Jewelry",       // Earings
  "10075": "Jewelry",       // Rings
  "10072": "Jewelry",       // Watches

  // Accessories
  "10010": "Accessories",   // Culflinks
  "10059": "Accessories",   // Gloves
  "10069": "Accessories",   // Shades
  "10009": "Accessories",   // Suspenders
  "10070": "Accessories",   // Perfumes
  "10040": "Accessories",   // Victor hugo (bag)
};

async function main() {
  await connectDb();
  console.log(`DB: ${mongoose.connection.name}  mode: ${DRY_RUN ? "DRY RUN" : "APPLY"}`);

  const products = await Product.find({ shopId: TARGET_SHOP_ID }).lean();
  console.log(`Products in shop ${TARGET_SHOP_ID}: ${products.length}\n`);

  const unmapped: typeof products = [];
  const byCategory: Record<string, string[]> = {};

  for (const p of products) {
    const cat = SKU_TO_CATEGORY[p.sku];
    if (!cat) {
      unmapped.push(p);
      continue;
    }
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(`${p.name} (sku=${p.sku})`);
  }

  console.log(`Category assignments (${Object.keys(byCategory).length} categories):`);
  for (const cat of Object.keys(byCategory).sort()) {
    console.log(`\n  ${cat} — ${byCategory[cat].length}`);
    for (const line of byCategory[cat]) console.log(`    - ${line}`);
  }

  if (unmapped.length > 0) {
    console.log(`\nUnmapped products (${unmapped.length}):`);
    for (const p of unmapped) console.log(`  - ${p.name} (sku=${p.sku})`);
  } else {
    console.log(`\nAll ${products.length} products mapped.`);
  }

  if (DRY_RUN) {
    console.log(`\n(dry run — re-run with --apply to write to DB)`);
    await mongoose.disconnect();
    return;
  }

  // 1. Upsert categories
  const categoryNames = [...new Set(Object.values(SKU_TO_CATEGORY))];
  const catDocs: Record<string, mongoose.Types.ObjectId> = {};
  for (const name of categoryNames) {
    const doc = await ProductCategory.findOneAndUpdate(
      { shopId: TARGET_SHOP_ID, normalizedName: normalizeName(name) },
      {
        $setOnInsert: {
          shopId: TARGET_SHOP_ID,
          name,
          normalizedName: normalizeName(name),
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );
    catDocs[name] = doc._id;
    console.log(`  category ready: ${name}  _id=${doc._id}`);
  }

  // 2. Update products
  let updated = 0;
  for (const p of products) {
    const cat = SKU_TO_CATEGORY[p.sku];
    if (!cat) continue;
    await Product.updateOne(
      { _id: p._id },
      { $set: { categoryId: catDocs[cat], categoryName: cat } }
    );
    updated++;
  }
  console.log(`\nDone. categories=${categoryNames.length}  productsUpdated=${updated}  unmapped=${unmapped.length}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
