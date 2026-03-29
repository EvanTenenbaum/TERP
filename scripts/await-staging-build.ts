import { execFileSync } from "node:child_process";
import { loadCodexEnv } from "./spreadsheet-native/qaEnv";

loadCodexEnv();

interface DigitalOceanApp {
  id: string;
  spec?: { name?: string | null } | null;
  default_ingress?: string | null;
  live_url?: string | null;
}

interface DigitalOceanDeployment {
  id: string;
  phase?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

interface VersionPayload {
  commit?: string | null;
  buildTime?: string | null;
  [key: string]: unknown;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    commit: "",
    baseUrl:
      process.env.PLAYWRIGHT_BASE_URL ??
      "https://terp-staging-yicld.ondigitalocean.app",
    timeoutSec: 900,
    pollSec: 10,
  };

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--commit") {
      options.commit = args[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (value === "--base-url") {
      options.baseUrl = args[index + 1] ?? options.baseUrl;
      index += 1;
      continue;
    }
    if (value === "--timeout-sec") {
      options.timeoutSec = Number(args[index + 1] ?? options.timeoutSec);
      index += 1;
      continue;
    }
    if (value === "--poll-sec") {
      options.pollSec = Number(args[index + 1] ?? options.pollSec);
      index += 1;
      continue;
    }
  }

  if (!options.commit) {
    throw new Error("Missing required `--commit <sha>`.");
  }

  return options;
}

function repoSlug() {
  const remote = execFileSync("git", ["remote", "get-url", "origin"], {
    encoding: "utf8",
  }).trim();
  const sshMatch = remote.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!sshMatch) {
    throw new Error(`Could not parse repo slug from origin remote: ${remote}`);
  }
  return `${sshMatch[1]}/${sshMatch[2]}`;
}

async function doFetchJson<T>(url: string) {
  const token = process.env.DIGITALOCEAN_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "DIGITALOCEAN_ACCESS_TOKEN is required for proof:await-staging-build."
    );
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `DigitalOcean API failed: ${response.status} ${await response.text()}`
    );
  }

  return (await response.json()) as T;
}

async function findStagingApp(baseUrl: string) {
  const targetHost = new URL(baseUrl).host;
  const payload = await doFetchJson<{ apps?: DigitalOceanApp[] }>(
    "https://api.digitalocean.com/v2/apps?per_page=200"
  );

  const app =
    payload.apps?.find(item => {
      for (const candidate of [item.default_ingress, item.live_url]) {
        if (!candidate) {
          continue;
        }
        try {
          if (new URL(candidate).host === targetHost) {
            return true;
          }
        } catch {
          if (candidate.includes(targetHost)) {
            return true;
          }
        }
      }
      return false;
    }) ?? null;

  if (!app) {
    throw new Error(
      `Could not find a DigitalOcean app whose ingress matches ${targetHost}.`
    );
  }

  return app;
}

async function listDeployments(appId: string) {
  const payload = await doFetchJson<{ deployments?: DigitalOceanDeployment[] }>(
    `https://api.digitalocean.com/v2/apps/${appId}/deployments?per_page=50`
  );
  return payload.deployments ?? [];
}

async function fetchVersion(baseUrl: string) {
  const response = await fetch(`${baseUrl}/version.json?ts=${Date.now()}`, {
    headers: {
      "Cache-Control": "no-cache",
    },
  });
  if (!response.ok) {
    throw new Error(
      `version.json fetch failed: ${response.status} ${await response.text()}`
    );
  }
  return (await response.json()) as VersionPayload;
}

function versionLooksFresh(
  version: VersionPayload,
  deployment: DigitalOceanDeployment,
  initialRaw: string
) {
  const raw = JSON.stringify(version);
  if (raw !== initialRaw) {
    return true;
  }

  const buildTime = version.buildTime
    ? Date.parse(version.buildTime)
    : Number.NaN;
  const deploymentCreatedAt = deployment.created_at
    ? Date.parse(deployment.created_at)
    : Number.NaN;
  if (Number.isFinite(buildTime) && Number.isFinite(deploymentCreatedAt)) {
    return buildTime >= deploymentCreatedAt - 60_000;
  }

  return false;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const options = parseArgs();
  const repo = repoSlug();
  const app = await findStagingApp(options.baseUrl);
  const initialVersion = await fetchVersion(options.baseUrl);
  const initialVersionRaw = JSON.stringify(initialVersion);
  const deadline = Date.now() + options.timeoutSec * 1000;

  while (Date.now() < deadline) {
    const deployments = await listDeployments(app.id);
    const deployment =
      deployments.find(
        candidate =>
          JSON.stringify(candidate).includes(options.commit) ||
          JSON.stringify(candidate).includes(options.commit.slice(0, 7))
      ) ?? null;
    if (!deployment) {
      await sleep(options.pollSec * 1000);
      continue;
    }

    const latestActiveDeployment =
      deployments.find(candidate => candidate.phase === "ACTIVE") ?? null;

    if (
      deployment.phase &&
      deployment.phase !== "ACTIVE" &&
      latestActiveDeployment &&
      latestActiveDeployment.id !== deployment.id
    ) {
      console.info(
        JSON.stringify(
          {
            ready: false,
            blocker: "superseded",
            commit: options.commit,
            deployment: {
              id: deployment.id,
              phase: deployment.phase,
              created_at: deployment.created_at ?? null,
              updated_at: deployment.updated_at ?? null,
            },
            latest_active_deployment: {
              id: latestActiveDeployment.id,
              phase: latestActiveDeployment.phase ?? null,
              created_at: latestActiveDeployment.created_at ?? null,
              updated_at: latestActiveDeployment.updated_at ?? null,
            },
          },
          null,
          2
        )
      );
      process.exit(1);
    }

    if (deployment.phase !== "ACTIVE") {
      await sleep(options.pollSec * 1000);
      continue;
    }

    const version = await fetchVersion(options.baseUrl);
    if (!versionLooksFresh(version, deployment, initialVersionRaw)) {
      await sleep(options.pollSec * 1000);
      continue;
    }

    console.info(
      JSON.stringify(
        {
          ready: true,
          commit: options.commit,
          repo,
          base_url: options.baseUrl,
          app: {
            id: app.id,
            spec_name: app.spec?.name ?? null,
            default_ingress: app.default_ingress ?? null,
          },
          deployment: {
            id: deployment.id,
            phase: deployment.phase ?? null,
            created_at: deployment.created_at ?? null,
            updated_at: deployment.updated_at ?? null,
          },
          version,
          version_changed_since_start:
            JSON.stringify(version) !== initialVersionRaw,
        },
        null,
        2
      )
    );
    return;
  }

  console.info(
    JSON.stringify(
      {
        ready: false,
        blocker: "timeout",
        commit: options.commit,
        timeout_sec: options.timeoutSec,
        base_url: options.baseUrl,
      },
      null,
      2
    )
  );
  process.exit(1);
}

await main();
