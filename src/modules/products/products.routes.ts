import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/roles.js";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct
} from "./products.controller.js";

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get("/", asyncHandler(listProducts));
productsRouter.get("/:id", asyncHandler(getProduct));

productsRouter.post("/", requireRole("OWNER", "ADMIN"), asyncHandler(createProduct));
productsRouter.patch("/:id", requireRole("OWNER", "ADMIN"), asyncHandler(updateProduct));
productsRouter.delete("/:id", requireRole("OWNER", "ADMIN"), asyncHandler(deleteProduct));