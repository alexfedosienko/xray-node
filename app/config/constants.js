import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = 3000;
export const CONFIG_FILE_PATH = path.join(__dirname, "xray-config.json");
export const XRAY_CORE_PATH = path.join("/usr/local/xray", "xray");
export const CONFIG_SERVICE_URL =
  process.env.CONFIG_SERVICE_URL ||
  "http://config-service.example.com/getConfig";
export const SERVICE_TOKEN =
  process.env.SERVICE_TOKEN || "default-service-token";
