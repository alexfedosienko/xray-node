import { readFileSync, writeFileSync, existsSync } from "fs";
import axios from "axios";
import { validateConfig } from "../config/validate.js";
import {
  CONFIG_FILE_PATH,
  CONFIG_SERVICE_URL,
  SERVICE_TOKEN,
} from "../config/constants.js";

export async function fetchConfig() {
  const response = await axios.get(CONFIG_SERVICE_URL, {
    headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
    timeout: 5000,
  });

  if (typeof response.data !== "object" || response.data === null) {
    throw new Error("Invalid config format: expected JSON object");
  }

  validateConfig(response.data);
  return response.data;
}

export function saveConfig(config) {
  validateConfig(config);
  const configString = JSON.stringify(config, null, 2);
  JSON.parse(configString); // Проверка валидности JSON
  writeFileSync(CONFIG_FILE_PATH, configString);
  console.log("Config saved successfully");
}

export function loadConfigFromFile() {
  if (!existsSync(CONFIG_FILE_PATH)) {
    throw new Error("Config file not found");
  }

  const fileContent = readFileSync(CONFIG_FILE_PATH, "utf8");
  const config = JSON.parse(fileContent);
  validateConfig(config);
  return config;
}
