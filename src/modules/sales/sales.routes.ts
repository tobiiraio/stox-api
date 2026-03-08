import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import {
  createSale,
  listSales,
  getSale
} from "./sales.controller.js";

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.get("/", asyncHandler(listSales));
salesRouter.get("/:id", asyncHandler(getSale));
salesRouter.post("/", asyncHandler(createSale));