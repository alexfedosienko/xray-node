import express from "express";
import { isXrayRunning, startOrRestartXray } from "../services/xray.js";
import { fetchConfig, saveConfig } from "../services/config.js";
import { CONFIG_FILE_PATH } from "../config/constants.js";
import { existsSync } from "fs";

export function setupRoutes(app) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({
      status: isXrayRunning() ? "running" : "stopped",
      configExists: existsSync(CONFIG_FILE_PATH),
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/update-config", async (req, res) => {
    try {
      const config = await fetchConfig();
      await saveConfig(config);
      await startOrRestartXray();
      res.json({
        status: "success",
        message: "Config updated and Xray restarted",
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.use("/", router);
}
