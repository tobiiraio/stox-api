import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import {
  createShop,
  listMyShops,
  getShop,
  updateShop,
  deactivateShop
} from "./shops.controller.js";

export const shopsRouter = Router();

shopsRouter.post("/", asyncHandler(createShop));

shopsRouter.get("/", requireAuth, asyncHandler(listMyShops));
shopsRouter.get("/:shopId", requireAuth, asyncHandler(getShop));
shopsRouter.patch("/:shopId", requireAuth, asyncHandler(updateShop));
shopsRouter.delete("/:shopId", requireAuth, asyncHandler(deactivateShop));