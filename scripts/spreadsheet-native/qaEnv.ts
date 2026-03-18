import path from "node:path";
import { config as loadDotenv } from "dotenv";

export function loadCodexEnv() {
  loadDotenv({
    path: path.resolve(process.env.HOME ?? "", ".codex/.env"),
    override: false,
  });
}

export function getEnvOrDefault(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}
