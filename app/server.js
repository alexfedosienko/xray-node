const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3000;
const CONFIG_FILE_PATH = path.join(__dirname, "xray-config.json");
const XRAY_CORE_PATH = path.join("/usr/local/xray", "xray");

const CONFIG_SERVICE_URL =
  process.env.CONFIG_SERVICE_URL ||
  "http://config-service.example.com/getConfig";

const SERVICE_TOKEN = process.env.SERVICE_TOKEN || "default-service-token";

let xrayProcess = null;
let xrayRunning = false;

// Middleware для логирования
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Функция для валидации конфига
function validateConfig(config) {
  try {
    if (typeof config !== "object" || config === null) {
      throw new Error("Config must be a JSON object");
    }

    // Проверка обязательных полей
    const requiredFields = ["inbounds", "outbounds"];
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Проверка структуры inbounds
    if (!Array.isArray(config.inbounds)) {
      throw new Error("inbounds must be an array");
    }

    // Дополнительные проверки можно добавить здесь
    return true;
  } catch (error) {
    console.error("Config validation failed:", error.message);
    throw error;
  }
}

// Функция для получения конфига с внешнего сервиса
async function fetchConfig() {
  try {
    const response = await axios.get(CONFIG_SERVICE_URL, {
      headers: {
        Authorization: `Bearer ${SERVICE_TOKEN}`,
      },
      timeout: 5000, // Таймаут 5 секунд
    });

    // Проверка что ответ содержит валидный JSON
    if (typeof response.data !== "object" || response.data === null) {
      throw new Error("Invalid config format: expected JSON object");
    }

    // Валидация структуры конфига
    validateConfig(response.data);

    return response.data;
  } catch (error) {
    console.error("Error fetching config:", error.message);
    throw new Error(`Failed to fetch config: ${error.message}`);
  }
}

// Функция для сохранения конфига
async function saveConfig(config) {
  try {
    // Дополнительная проверка перед сохранением
    validateConfig(config);

    // Преобразуем в JSON с проверкой
    const configString = JSON.stringify(config, null, 2);
    JSON.parse(configString); // Проверка что строка валидный JSON

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
    console.log("Config saved successfully");
    return true;
  } catch (error) {
    console.error("Failed to save config:", error);
    throw new Error(`Failed to save config: ${error.message}`);
  }
}

// Функция для загрузки конфига из файла с проверкой
function loadConfigFromFile() {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error("Config file not found");
    }

    const fileContent = fs.readFileSync(CONFIG_FILE_PATH, "utf8");
    const config = JSON.parse(fileContent);

    // Валидация загруженного конфига
    validateConfig(config);

    return config;
  } catch (error) {
    console.error("Error loading or validating config file:", error.message);
    throw new Error(`Config file error: ${error.message}`);
  }
}

// Функция для запуска/перезапуска Xray-core
async function startOrRestartXray() {
  // Останавливаем предыдущий процесс, если он есть
  if (xrayProcess) {
    console.log("Stopping existing Xray process...");
    xrayProcess.kill();
    xrayProcess = null;
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Даем время на завершение
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

// В функции initializeService добавляем обработку ошибок валидации
async function initializeService() {
  try {
    console.log("Initializing service...");

    try {
      console.log("Fetching config from:", CONFIG_SERVICE_URL);
      const config = await fetchConfig();
      await saveConfig(config);
    } catch (fetchError) {
      console.error("Failed to fetch new config, trying existing file...");
      try {
        const existingConfig = loadConfigFromFile();
        console.log("Using existing valid config file");
      } catch (fileError) {
        throw new Error(`No valid config available: ${fileError.message}`);
      }
    }

    await startOrRestartXray();
    console.log("Service initialized successfully");
  } catch (error) {
    console.error("Initialization failed:", error.message);
    throw error;
  }
}

// API Endpoints
app.get("/health", (req, res) => {
  res.json({
    status: xrayRunning ? "running" : "stopped",
    configExists: fs.existsSync(CONFIG_FILE_PATH),
    timestamp: new Date().toISOString(),
  });
});

app.get("/update-config", async (req, res) => {
  try {
    console.log("Updating configuration...");
    const config = await fetchConfig();
    await saveConfig(config);
    await startOrRestartXray();

    res.json({
      status: "success",
      message: "Config updated and Xray restarted",
    });
  } catch (error) {
    console.error("Config update failed:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Обработка завершения работы
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

async function gracefulShutdown() {
  console.log("Shutting down gracefully...");

  if (xrayProcess) {
    console.log("Stopping Xray process...");
    xrayProcess.kill();
  }

  console.log("Service stopped");
  process.exit(0);
}

// Запуск сервера
async function startServer() {
  try {
    await initializeService();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
