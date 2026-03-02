import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { authMeRouter } from "./modules/auth/auth.me.routes.js";
import { errorHandler } from "./middlewares/error.js";
import { shopsRouter } from "./modules/shops/shops.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(compression());
  app.use(morgan("dev"));

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/auth", authMeRouter);
  app.use("/api/shops", shopsRouter);
  app.use("/api/users", usersRouter);

  app.use(errorHandler);
  return app;
}