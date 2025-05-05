export function validateConfig(config) {
  if (typeof config !== "object" || config === null) {
    throw new Error("Config must be a JSON object");
  }

  const requiredFields = ["inbounds", "outbounds"];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(config.inbounds)) {
    throw new Error("inbounds must be an array");
  }

  return true;
}
