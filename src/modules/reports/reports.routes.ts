import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import {
  getSalesSummary,
  getTopProducts,
  getLowStock,
  getDailyReport
} from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get("/sales-summary", asyncHandler(getSalesSummary));
reportsRouter.get("/top-products", asyncHandler(getTopProducts));
reportsRouter.get("/low-stock", asyncHandler(getLowStock));
reportsRouter.get("/daily", asyncHandler(getDailyReport));