import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export type JwtPayload = {
  sub: string;
  shopId: string;
  role: "OWNER" | "ADMIN" | "STAFF";
};

const accessSecret: Secret = env.jwtAccessSecret;
const refreshSecret: Secret = env.jwtRefreshSecret;

function parseExpiresIn(input: string): SignOptions["expiresIn"] {
  // jsonwebtoken supports numbers (seconds) or strings like "15m", "2h", "7d"
  // We'll accept:
  // - digits only -> treat as seconds
  // - digits + unit (ms/s/m/h/d) -> pass through
  const v = input.trim();

  if (/^\d+$/.test(v)) {
    return Number(v);
  }

  if (/^\d+(ms|s|m|h|d)$/.test(v)) {
    return v as unknown as SignOptions["expiresIn"];
  }

  // If you ever want weeks, add 'w' and ensure jsonwebtoken/ms supports it.
  const err: any = new Error(`Invalid expiresIn value: "${input}". Use e.g. "15m", "1h", "7d" or seconds as a number string.`);
  err.statusCode = 500;
  throw err;
}

function signWithOpts(payload: JwtPayload, secret: Secret, expiresIn?: SignOptions["expiresIn"]) {
  const opts: SignOptions = {};
  if (expiresIn !== undefined) opts.expiresIn = expiresIn;
  return jwt.sign(payload, secret, opts);
}

export function signAccessToken(payload: JwtPayload) {
  return signWithOpts(payload, accessSecret, parseExpiresIn(env.jwtAccessExpiresIn));
}

export function signRefreshToken(payload: JwtPayload) {
  return signWithOpts(payload, refreshSecret, parseExpiresIn(env.jwtRefreshExpiresIn));
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as JwtPayload;
}