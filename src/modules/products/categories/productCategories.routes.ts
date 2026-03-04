import { Router } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { requireAuth } from "../../../middlewares/auth.js";
import { requireRole } from "../../../middlewares/roles.js";
import {
  createProductCategory,
  listProductCategories,
  getProductCategory,
  updateProductCategory,
  deleteProductCategory
} from "./productCategories.controller.js";

export const productCategoriesRouter = Router();

productCategoriesRouter.use(requireAuth);

productCategoriesRouter.get("/", asyncHandler(listProductCategories));
productCategoriesRouter.get("/:id", asyncHandler(getProductCategory));

productCategoriesRouter.post("/", requireRole("OWNER", "ADMIN"), asyncHandler(createProductCategory));
productCategoriesRouter.patch("/:id", requireRole("OWNER", "ADMIN"), asyncHandler(updateProductCategory));
productCategoriesRouter.delete("/:id", requireRole("OWNER", "ADMIN"), asyncHandler(deleteProductCategory));