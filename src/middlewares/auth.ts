import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt.js";

export type AuthedRequest = Request & { user?: JwtPayload };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) return res.status(401).json({ ok: false, message: "Missing access token" });

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired access token" });
  }
}