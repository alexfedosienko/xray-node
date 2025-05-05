import express from "express";
import { initializeService } from "./services/xray.js";
import { setupRoutes } from "./api/routes.js";
import { setupMiddleware } from "./api/middleware.js";
import { setupGracefulShutdown } from "./utils/shutdown.js";
import { PORT } from "./config/constants.js";

const app = express();

async function startServer() {
  try {
    setupMiddleware(app);
    setupRoutes(app);

    await initializeService();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    setupGracefulShutdown();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
