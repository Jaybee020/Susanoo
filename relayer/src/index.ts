import "dotenv/config";
import cron from "node-cron";
import { getConfig } from "./config.js";
import { buildServer } from "./server.js";
import { getDb, closeDb } from "./db/index.js";
import { registerRoutes } from "./api/index.js";
import { registerWebSocket } from "./ws/index.js";
import { startIndexers, stopAllIndexers } from "./indexer/index.js";
import { refreshAllPoolStats } from "./api/routes/stats.js";
import { applySeedPools } from "./seed.js";
import { startBot, stopBot } from "./bot/index.js";

async function main() {
  // 1. Validate config
  const config = getConfig();
  console.log("[Boot] Config validated");

  // 2. Test DB connection
  const db = getDb();
  console.log("[Boot] Database connected");

  // 3. Seed pools from config
  await applySeedPools();
  console.log("[Boot] Seed pools applied");

  // 4. Build server
  const server = await buildServer();

  // 4. Register routes + WebSocket
  await registerRoutes(server);
  await registerWebSocket(server);
  console.log("[Boot] Routes & WebSocket registered");

  // 5. Start server
  await server.listen({ port: config.PORT, host: config.HOST });
  console.log(`[Boot] Server listening on ${config.HOST}:${config.PORT}`);

  // 6. Start indexers for all active pools
  await startIndexers();
  console.log("[Boot] Indexers started");

  // 7. Start market maker bot
  startBot();

  // 8. Stats refresh cron (every 60 seconds)
  cron.schedule("* * * * *", async () => {
    try {
      await refreshAllPoolStats();
    } catch (err) {
      console.error("[Cron] Stats refresh error:", err);
    }
  });
  console.log("[Boot] Stats cron scheduled");

  // Initial stats computation
  await refreshAllPoolStats().catch(() => {});

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Shutdown] Stopping...");
    stopBot();
    stopAllIndexers();
    await server.close();
    await closeDb();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
