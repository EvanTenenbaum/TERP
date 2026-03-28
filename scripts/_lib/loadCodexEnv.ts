import path from "node:path";
import { config as loadDotenv } from "dotenv";

export function getCodexEnvPath(homeDir = process.env.HOME ?? "") {
  return path.resolve(homeDir, ".codex/.env");
}

export function loadCodexEnv(options?: {
  homeDir?: string;
  override?: boolean;
  path?: string;
}) {
  return loadDotenv({
    path: options?.path ?? getCodexEnvPath(options?.homeDir),
    override: options?.override ?? false,
    quiet: true,
  });
}
