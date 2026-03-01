import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
}

export function getDbStatus() {
  const state = mongoose.connection.readyState;

  // 0 = disconnected
  // 1 = connected
  // 2 = connecting
  // 3 = disconnecting

  const states: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  return {
    state,
    status: states[state] ?? "unknown"
  };
}