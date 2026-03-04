import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./auth.js";

export function tenantGuard(req: AuthedRequest, res: Response, next: NextFunction) {
  const headerShopId = (req.header("x-shop-id") ?? "").trim();
  const jwtShopId = req.user?.shopId;

  const shopId = jwtShopId || headerShopId;

  if (!shopId) {
    return res.status(400).json({ ok: false, message: "Missing shopId (JWT or X-Shop-Id)" });
  }

  (req as any).shopId = shopId;
  return next();
}