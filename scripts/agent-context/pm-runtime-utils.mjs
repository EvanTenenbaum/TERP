import { lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

function readJsonIfExists(targetPath) {
  try {
    return JSON.parse(readFileSync(targetPath, "utf8"));
  } catch {
    return null;
  }
}

function resolveGitDir(repoRoot) {
  const gitPath = path.join(repoRoot, ".git");
  try {
    const stat = lstatSync(gitPath);
    if (stat.isDirectory()) {
      return gitPath;
    }
    const raw = readFileSync(gitPath, "utf8").trim();
    const prefix = "gitdir:";
    if (raw.startsWith(prefix)) {
      return path.resolve(repoRoot, raw.slice(prefix.length).trim());
    }
  } catch {
    // Fall through to the default path.
  }
  return gitPath;
}

function getRuntimePaths(repoRoot) {
  const baseDir = path.join(resolveGitDir(repoRoot), "pm-runtime");
  return {
    baseDir,
    locksDir: path.join(baseDir, "locks"),
    stampsDir: path.join(baseDir, "stamps"),
  };
}

function ensureRuntimeDirs(repoRoot) {
  const paths = getRuntimePaths(repoRoot);
  mkdirSync(paths.locksDir, { recursive: true });
  mkdirSync(paths.stampsDir, { recursive: true });
  return paths;
}

function acquireTaskLock(lockDir, metadata, ttlSeconds) {
  while (true) {
    try {
      mkdirSync(lockDir, { recursive: false });
      writeFileSync(path.join(lockDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
      return {
        acquired: true,
        metadata,
      };
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }

      const existingMetadata = readJsonIfExists(path.join(lockDir, "metadata.json"));
      const lockStartedAt =
        existingMetadata?.started_at ||
        (() => {
          try {
            return lstatSync(lockDir).mtime.toISOString();
          } catch {
            return null;
          }
        })();
      if (lockStartedAt) {
        const ageSeconds = (Date.now() - Date.parse(lockStartedAt)) / 1000;
        if (Number.isFinite(ageSeconds) && ageSeconds < ttlSeconds) {
          return {
            acquired: false,
            reason: "lock-active",
            metadata: existingMetadata || {
              task: metadata.task,
              pid: null,
              started_at: lockStartedAt,
            },
          };
        }
      }

      rmSync(lockDir, { recursive: true, force: true });
    }
  }
}

function writeStamp(stampPath, payload) {
  writeFileSync(stampPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runGuardedPmTask({
  repoRoot,
  taskName,
  debounceSeconds = 0,
  lockTtlSeconds = 900,
  run,
}) {
  const resolvedRepoRoot = path.resolve(repoRoot || process.cwd());
  const runtimePaths = ensureRuntimeDirs(resolvedRepoRoot);
  const stampPath = path.join(runtimePaths.stampsDir, `${taskName}.json`);
  const lastStamp = readJsonIfExists(stampPath);
  const now = new Date();

  if (debounceSeconds > 0 && lastStamp?.finished_at) {
    const sinceLastRunSeconds = (now.getTime() - Date.parse(lastStamp.finished_at)) / 1000;
    if (Number.isFinite(sinceLastRunSeconds) && sinceLastRunSeconds < debounceSeconds) {
      return {
        status: "skipped",
        reason: "debounced",
        taskName,
        repoRoot: resolvedRepoRoot,
        debounceSeconds,
        lastFinishedAt: lastStamp.finished_at,
      };
    }
  }

  const lockDir = path.join(runtimePaths.locksDir, `${taskName}.lock`);
  const lock = acquireTaskLock(
    lockDir,
    {
      task: taskName,
      pid: process.pid,
      started_at: now.toISOString(),
    },
    lockTtlSeconds,
  );

  if (!lock.acquired) {
    return {
      status: "skipped",
      reason: lock.reason,
      taskName,
      repoRoot: resolvedRepoRoot,
      holder: lock.metadata,
    };
  }

  try {
    const result = await run();
    const finishedAt = new Date().toISOString();
    writeStamp(stampPath, {
      task: taskName,
      pid: process.pid,
      finished_at: finishedAt,
      status: "ok",
    });
    return {
      status: "ran",
      taskName,
      repoRoot: resolvedRepoRoot,
      finishedAt,
      result,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    writeStamp(stampPath, {
      task: taskName,
      pid: process.pid,
      finished_at: finishedAt,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    rmSync(lockDir, { recursive: true, force: true });
  }
}

export async function runExclusivePmTask({
  repoRoot,
  taskName,
  lockTtlSeconds = 900,
  waitTimeoutSeconds = 120,
  pollIntervalMs = 100,
  run,
}) {
  const resolvedRepoRoot = path.resolve(repoRoot || process.cwd());
  const runtimePaths = ensureRuntimeDirs(resolvedRepoRoot);
  const lockDir = path.join(runtimePaths.locksDir, `${taskName}.lock`);
  const waitStartedAt = Date.now();

  while (true) {
    const metadata = {
      task: taskName,
      pid: process.pid,
      started_at: new Date().toISOString(),
    };
    const lock = acquireTaskLock(lockDir, metadata, lockTtlSeconds);

    if (lock.acquired) {
      try {
        const result = await run();
        return {
          status: "ran",
          taskName,
          repoRoot: resolvedRepoRoot,
          waitedMs: Date.now() - waitStartedAt,
          result,
        };
      } finally {
        rmSync(lockDir, { recursive: true, force: true });
      }
    }

    if (waitTimeoutSeconds >= 0 && Date.now() - waitStartedAt > waitTimeoutSeconds * 1000) {
      throw new Error(
        `Timed out waiting for PM task lock "${taskName}" after ${waitTimeoutSeconds}s.`,
      );
    }

    await sleep(pollIntervalMs);
  }
}
