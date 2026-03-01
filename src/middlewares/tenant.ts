import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./auth.js";

/**
 * Enforces tenant isolation (shopId).
 * - If authenticated: uses JWT shopId
 * - Else: allows request to provide X-Shop-Id header for public endpoints (optional)
 */
export function tenantGuard(req: AuthedRequest, res: Response, next: NextFunction) {
  const headerShopId = (req.header("x-shop-id") ?? "").trim();
  const jwtShopId = req.user?.shopId;

  const shopId = jwtShopId || headerShopId;

  if (!shopId) {
    return res.status(400).json({ ok: false, message: "Missing shopId (JWT or X-Shop-Id)" });
  }

  // attach for downstream usage
  (req as any).shopId = shopId;
  next();
}