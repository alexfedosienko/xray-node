import { xrayProcess } from "../services/xray.js";

export function setupGracefulShutdown() {
  const shutdownSignals = ["SIGTERM", "SIGINT"];

  shutdownSignals.forEach((signal) => {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      if (xrayProcess) xrayProcess.kill();
      process.exit(0);
    });
  });
}
