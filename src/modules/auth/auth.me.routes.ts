import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import type { AuthedRequest } from "../../middlewares/auth.js";

export const authMeRouter = Router();

authMeRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ ok: true, user: req.user });
});