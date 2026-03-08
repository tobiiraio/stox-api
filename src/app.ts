import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";

import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { authMeRouter } from "./modules/auth/auth.me.routes.js";
import { errorHandler } from "./middlewares/error.js";
import { shopsRouter } from "./modules/shops/shops.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { productCategoriesRouter } from "./modules/products/categories/productCategories.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { inventoryRouter } from "./modules/inventory/inventory.routes.js";
import { purchasesRouter } from "./modules/purchases/purchases.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());

app.options(/.*/, cors());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(compression());
  app.use(morgan("dev"));

  app.get("/", (_req, res) => res.send("STOX API is running"));
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/auth", authMeRouter);
  app.use("/api/shops", shopsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/products/categories", productCategoriesRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/purchases", purchasesRouter);
  

  app.use(errorHandler);
  return app;
}