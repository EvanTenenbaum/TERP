import path from "node:path";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { generateContext, getPmPaths } from "./generate-agent-context.mjs";
import { runGuardedPmTask } from "./pm-runtime-utils.mjs";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo-root") {
      options.repoRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--output-dir") {
      options.outputDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--debounce-seconds") {
      options.debounceSeconds = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--lock-ttl-seconds") {
      options.lockTtlSeconds = Number(argv[index + 1]);
      index += 1;
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const task = await runGuardedPmTask({
  repoRoot: options.repoRoot,
  taskName: "publish",
  debounceSeconds: Number.isFinite(options.debounceSeconds) ? options.debounceSeconds : 10,
  lockTtlSeconds: Number.isFinite(options.lockTtlSeconds) ? options.lockTtlSeconds : 900,
  run: () => {
    const publishAt = new Date().toISOString();
    return (
    generateContext({
      repoRoot: options.repoRoot,
      reason: "publish",
      now: publishAt,
      publishAt,
    })
    );
  },
});

if (task.status !== "ran") {
  console.info(
    JSON.stringify(
      {
        status: task.status,
        taskName: task.taskName,
        reason: task.reason,
        holder: task.holder || null,
        lastFinishedAt: task.lastFinishedAt || null,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const bundle = task.result;
const paths = getPmPaths(options.repoRoot);
const publishAt = bundle.health.last_publish || bundle.health.generated_at || bundle.state.generatedAt;

if (options.outputDir) {
  const targetDir = path.resolve(options.outputDir);
  mkdirSync(targetDir, { recursive: true });
  cpSync(bundle.paths.publicDir, targetDir, {
    recursive: true,
    force: true,
  });
}

console.info(
  JSON.stringify(
    {
      status: task.status,
      taskName: task.taskName,
      publicDir: paths.publicDir,
      mirroredTo: options.outputDir || null,
      publishedAt: publishAt,
      healthPath: paths.publicHealthPath,
      exists: existsSync(paths.publicHealthPath),
    },
    null,
    2,
  ),
);
