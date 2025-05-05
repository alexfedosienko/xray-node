import { spawn } from "child_process";
import { XRAY_CORE_PATH, CONFIG_FILE_PATH } from "../config/constants.js";
import { loadConfigFromFile, saveConfig, fetchConfig } from "./config.js";

export let xrayProcess = null;
export let xrayRunning = false;

export async function startOrRestartXray() {
  if (xrayProcess) {
    console.log("Stopping existing Xray process...");
    xrayProcess.kill();
    xrayProcess = null;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("Starting Xray-core with new config...");
  xrayProcess = spawn(XRAY_CORE_PATH, ["-config", CONFIG_FILE_PATH]);

  xrayProcess.stdout.on("data", (data) => {
    console.log(`[Xray] ${data.toString().trim()}`);
  });

  xrayProcess.stderr.on("data", (data) => {
    console.error(`[Xray] ${data.toString().trim()}`);
  });

  xrayProcess.on("error", (err) => {
    console.error("Failed to start Xray:", err);
    xrayProcess = null;
    xrayRunning = false;
  });

  xrayProcess.on("close", (code) => {
    console.log(`Xray process exited with code ${code}`);
    xrayProcess = null;
    xrayRunning = false;
  });

  xrayRunning = true;
}

export async function initializeService() {
  try {
    console.log("Initializing service...");

    try {
      const config = await fetchConfig();
      await saveConfig(config);
    } catch (fetchError) {
      console.error("Failed to fetch new config, trying existing file...");
      await loadConfigFromFile();
    }

    await startOrRestartXray();
    console.log("Service initialized successfully");
  } catch (error) {
    console.error("Initialization failed:", error.message);
    throw error;
  }
}

export function isXrayRunning() {
  return xrayRunning;
}
