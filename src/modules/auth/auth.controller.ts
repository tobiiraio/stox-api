import type { Request, Response } from "express";
import { z } from "zod";
import { requestOtpService, verifyOtpService } from "./auth.service.js";

const requestSchema = z.object({
  email: z.string().email(),
  shopId: z.string().min(2).max(100)
});

const verifySchema = z.object({
  email: z.string().email(),
  shopId: z.string().min(2).max(100),
  code: z.string().min(4).max(10)
});

export async function requestOtp(req: Request, res: Response) {
  const { email, shopId } = requestSchema.parse(req.body);
  await requestOtpService(email, shopId);
  res.json({ ok: true });
}

export async function verifyOtp(req: Request, res: Response) {
  const { email, shopId, code } = verifySchema.parse(req.body);
  const data = await verifyOtpService(email, shopId, code);
  res.json({ ok: true, ...data });
}