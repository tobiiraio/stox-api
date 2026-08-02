import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/roles.js";
import { inviteUser, listUsers, deactivateUser, updateUserRole } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.post("/invite", requireAuth, requireRole("OWNER", "ADMIN"), asyncHandler(inviteUser));
usersRouter.get("/", requireAuth, requireRole("OWNER", "ADMIN"), asyncHandler(listUsers));
usersRouter.delete("/:userId", requireAuth, requireRole("OWNER", "ADMIN"), asyncHandler(deactivateUser));
usersRouter.patch("/:userId", requireAuth, requireRole("OWNER"), asyncHandler(updateUserRole));