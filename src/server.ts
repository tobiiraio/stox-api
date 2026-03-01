import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { assertEnv, env } from "./config/env.js";

async function bootstrap() {
  assertEnv();

  try {
    await connectDb();
    console.log("Database status: UP (MongoDB connected)");
  } catch (err) {
    console.error("Database status: DOWN (failed to connect)");
    throw err;
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`Server status: UP (listening on port ${env.port})`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down server...`);
    server.close(() => {
      console.log("Server status: DOWN");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});