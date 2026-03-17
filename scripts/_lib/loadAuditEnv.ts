import fs from "fs";
import os from "os";
import path from "path";
import dotenv from "dotenv";

const DEFAULT_LOCAL_AUDIT_DATABASE_URL =
  "mysql://test:test@localhost:3306/terp_test";

export interface AuditEnvLoadResult {
  loadedFrom: string[];
  databaseUrlPresent: boolean;
}

function buildDatabaseUrlFromDoStagingParts(): string | null {
  const host = process.env.DO_STAGING_DB_HOST;
  const port = process.env.DO_STAGING_DB_PORT;
  const user = process.env.DO_STAGING_DB_USER;
  const password = process.env.DO_STAGING_DB_PASSWORD;
  const database = process.env.DO_STAGING_DB_NAME;

  if (!host || !port || !user || !password || !database) {
    return null;
  }

  const url = new URL(
    `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
  );

  const sslMode = process.env.DO_STAGING_DB_SSLMODE;
  if (sslMode) {
    url.searchParams.set("ssl-mode", sslMode);
  }

  return url.toString();
}

export function loadAuditEnv(): AuditEnvLoadResult {
  const loadedFrom: string[] = [];

  if (process.env.DATABASE_URL) {
    loadedFrom.push("process.env.DATABASE_URL");
    return {
      loadedFrom,
      databaseUrlPresent: true,
    };
  }

  const candidatePaths = [
    process.env.TERP_AUDIT_ENV_FILE,
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env.production"),
    path.join(os.homedir(), ".codex", ".env"),
  ].filter((value): value is string => Boolean(value));

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) {
      continue;
    }

    const result = dotenv.config({ path: candidatePath, override: false });
    if (!result.error) {
      loadedFrom.push(candidatePath);
    }

    if (process.env.DATABASE_URL) {
      break;
    }
  }

  if (!process.env.DATABASE_URL) {
    const derivedStagingUrl = buildDatabaseUrlFromDoStagingParts();
    if (derivedStagingUrl) {
      process.env.DATABASE_URL = derivedStagingUrl;
      loadedFrom.push("derived-from-do-staging-db-env");
    }
  }

  if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    loadedFrom.push("process.env.TEST_DATABASE_URL");
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = DEFAULT_LOCAL_AUDIT_DATABASE_URL;
    loadedFrom.push("default-local-test-db");
  }

  return {
    loadedFrom,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
  };
}
