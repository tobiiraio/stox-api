import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/roles.js";
import {
  listInventoryBalances,
  getInventoryBalanceByProduct,
  listStockMovements,
  adjustInventory
} from "./inventory.controller.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get("/balances", asyncHandler(listInventoryBalances));
inventoryRouter.get("/balances/:productId", asyncHandler(getInventoryBalanceByProduct));
inventoryRouter.get("/movements", asyncHandler(listStockMovements));

inventoryRouter.post(
  "/adjustments",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(adjustInventory)
);