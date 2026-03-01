import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.statusCode ?? err?.status ?? 500);

  if (status >= 500) console.error(err);

  res.status(status).json({
    ok: false,
    message: err?.message ?? "Internal Server Error"
  });
}