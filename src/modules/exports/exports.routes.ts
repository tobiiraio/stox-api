import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/roles.js";
import {
  exportProductsHandler,
  exportVariantsHandler,
  exportSalesHandler,
  exportPurchasesHandler,
  exportBalancesHandler,
  exportMovementsHandler,
  exportSuppliersHandler,
  exportStaffHandler,
} from "./exports.controller.js";

export const exportsRouter = Router();

exportsRouter.use(requireAuth);
exportsRouter.use(requireRole("OWNER", "ADMIN"));

const register = (path: string, handler: any) => {
  exportsRouter.get(`${path}.csv`, asyncHandler(handler));
  exportsRouter.get(`${path}.xlsx`, asyncHandler(handler));
};

register("/products", exportProductsHandler);
register("/products/:productId/variants", exportVariantsHandler);
register("/sales", exportSalesHandler);
register("/purchases", exportPurchasesHandler);
register("/inventory/balances", exportBalancesHandler);
register("/inventory/movements", exportMovementsHandler);
register("/suppliers", exportSuppliersHandler);
register("/staff", exportStaffHandler);
