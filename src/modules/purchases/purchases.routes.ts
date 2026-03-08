import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/roles.js";
import {
  createPurchase,
  listPurchases,
  getPurchase
} from "./purchases.controller.js";

export const purchasesRouter = Router();

purchasesRouter.use(requireAuth);

purchasesRouter.get("/", asyncHandler(listPurchases));
purchasesRouter.get("/:id", asyncHandler(getPurchase));

purchasesRouter.post(
  "/",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(createPurchase)
);