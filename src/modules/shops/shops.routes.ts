import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createShop } from "./shops.controller.js";

export const shopsRouter = Router();

// Public bootstrap endpoint (first-time setup)
shopsRouter.post("/", asyncHandler(createShop));