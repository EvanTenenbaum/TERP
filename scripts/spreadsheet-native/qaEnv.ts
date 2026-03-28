import { getCodexEnvPath, loadCodexEnv as loadSharedCodexEnv } from "../_lib/loadCodexEnv";

export function loadCodexEnv() {
  loadSharedCodexEnv();
}

export function getEnvOrDefault(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

export { getCodexEnvPath };
