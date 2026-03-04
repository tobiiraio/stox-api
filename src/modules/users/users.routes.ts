import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/roles.js";
import { inviteUser } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.post("/invite", requireAuth, requireRole("OWNER", "ADMIN"), asyncHandler(inviteUser));