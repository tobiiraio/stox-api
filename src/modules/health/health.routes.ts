import { Router } from "express";
import { getDbStatus } from "../../config/db.js";

export const healthRouter = Router();

/**
 * Basic liveness
 */
healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString()
  });
});

/**
 * Combined server + DB status
 */
healthRouter.get("/status", (_req, res) => {
  const db = getDbStatus();
  const isReady = db.state === 1;

  res.status(isReady ? 200 : 503).json({
    service: "stox-api",
    server: "up",
    database: db.status,
    ready: isReady,
    timestamp: new Date().toISOString()
  });
});

/**
 * DB readiness only
 */
healthRouter.get("/ready", (_req, res) => {
  const db = getDbStatus();
  const isReady = db.state === 1;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "READY" : "NOT_READY",
    database: db.status,
    timestamp: new Date().toISOString()
  });
});