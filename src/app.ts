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

export function createApp() {
  const app = express();

  const corsOptions: cors.CorsOptions = {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  };

  app.use(helmet());
  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(compression());
  app.use(morgan("dev"));

  app.get("/", (_req, res) => {
    res.send("STOX API is running");
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/auth", authMeRouter);
  app.use("/api/shops", shopsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/products/categories", productCategoriesRouter);
  app.use("/api/products", productsRouter);

  app.use(errorHandler);

  return app;
}