import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requestOtp, verifyOtp, refreshToken } from "./auth.controller.js";
import { authRateLimit } from "../../middlewares/rateLimit.js";

export const authRouter = Router();
authRouter.use(authRateLimit);

authRouter.post("/otp/request", asyncHandler(requestOtp));
authRouter.post("/otp/verify", asyncHandler(verifyOtp));
authRouter.post("/refresh", asyncHandler(refreshToken));