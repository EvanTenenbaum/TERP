import { request } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESM-safe __dirname replacement (package.json has "type": "module")
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface AuthStateResult {
  storageStatePath: string;
  authenticated: boolean;
}

function ensureDirectoryExists(filePath: string): void {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export async function prepareAuthState(
  baseURL: string
): Promise<AuthStateResult> {
  // Use process.cwd() fallback for environments where import.meta.url transforms fail
  const resolvedDir = __dirname || path.join(process.cwd(), "tests", "e2e", "setup");
  const storageStatePath = path.join(resolvedDir, "../artifacts/auth-state.json");
  ensureDirectoryExists(storageStatePath);

  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const apiBase =
    process.env.E2E_API_BASE_URL ?? `${baseURL.replace(/\/$/, "")}/api`;

  // If no credentials are supplied, create an empty storage state so tests can still run with mocks.
  if (!username || !password) {
    const emptyState = {
      cookies: [],
      origins: [] as Array<Record<string, unknown>>,
    };
    fs.writeFileSync(storageStatePath, JSON.stringify(emptyState));
    return { storageStatePath, authenticated: false };
  }

  const context = await request.newContext({ baseURL: apiBase });
  const response = await context.post("/auth/login", {
    data: { username, password },
  });

  const authenticated = response.ok();
  await context.storageState({ path: storageStatePath });
  await context.dispose();

  return { storageStatePath, authenticated };
}
