import { generateContext } from "./generate-agent-context.mjs";
import { runGuardedPmTask } from "./pm-runtime-utils.mjs";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo-root") {
      options.repoRoot = argv[index + 1];
      index += 1;
    }
    if (arg === "--skip-linear") {
      options.skipLinear = true;
    }
    if (arg === "--debounce-seconds") {
      options.debounceSeconds = Number(argv[index + 1]);
      index += 1;
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
  taskName: "linear-reconcile",
  debounceSeconds: Number.isFinite(options.debounceSeconds) ? options.debounceSeconds : 10,
  lockTtlSeconds: Number.isFinite(options.lockTtlSeconds) ? options.lockTtlSeconds : 900,
  run: () =>
    generateContext({
      ...options,
      reason: "linear-reconcile",
    }),
});

console.info(
  JSON.stringify(
    task.status === "ran"
      ? {
          status: task.status,
          taskName: task.taskName,
          conflicts: task.result.conflicts.length,
          linearMode: task.result.linear.mode,
          latestIssueUpdatedAt: task.result.linear.latestIssueUpdatedAt,
        }
      : {
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
