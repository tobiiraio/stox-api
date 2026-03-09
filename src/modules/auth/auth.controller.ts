import type { Request, Response } from "express";
import { z } from "zod";
import {
  requestOtpService,
  requestOtpForShopService,
  verifyOtpService,
  refreshAccessTokenService
} from "./auth.service.js";

const requestSchema = z.object({
  email: z.string().email(),
  shopId: z.string().min(2).max(100).optional()
});

const verifySchema = z.object({
  email: z.string().email(),
  shopId: z.string().min(2).max(100),
  code: z.string().min(4).max(10)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export async function requestOtp(req: Request, res: Response) {
  const { email, shopId } = requestSchema.parse(req.body);

  const result = shopId
    ? await requestOtpForShopService(email, shopId)
    : await requestOtpService(email);

  return res.json({
    ok: true,
    ...result
  });
}

export async function verifyOtp(req: Request, res: Response) {
  const { email, shopId, code } = verifySchema.parse(req.body);
  const data = await verifyOtpService(email, shopId, code);

  return res.json({
    ok: true,
    ...data
  });
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  const data = await refreshAccessTokenService(refreshToken);

  return res.json({
    ok: true,
    ...data
  });
}