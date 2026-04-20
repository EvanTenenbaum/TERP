import { checkpointPm } from "./generate-agent-context.mjs";

function parseArgs(argv) {
  const options = {
    linearRefs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo-root") {
      options.repoRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--client-id") {
      options.clientId = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--based-on-sha") {
      options.basedOnSha = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--summary") {
      options.summary = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--rationale") {
      options.rationale = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--linear-ref") {
      options.linearRefs.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--skip-linear-writeback") {
      options.skipLinearWriteback = true;
      continue;
    }
    if (arg === "--skip-linear") {
      options.skipLinear = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.clientId) {
    throw new Error("pm-checkpoint requires --client-id.");
  }

  const result = await checkpointPm(options);
  console.info(
    JSON.stringify(
      {
        manifestGitSha: result.manifest.git_sha,
        freshness: result.state.freshness.status,
        linearWriteback: result.linearWriteback,
      },
      null,
      2,
    ),
  );
}

await main();
