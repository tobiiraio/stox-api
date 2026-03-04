import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.js";
import type { UserRole } from "../modules/users/user.model.js";

export function requireRole(...allowed: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    if (!allowed.includes(role)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    return next();
  };
}