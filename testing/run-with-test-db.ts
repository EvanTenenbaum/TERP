import { spawnSync } from "child_process";
import { ensureTestDatabase } from "./db-util";

type ResetMode = "never" | "always";

function parseArgs(argv: string[]): {
  scenario: string;
  reset: ResetMode;
  command: string;
  args: string[];
} {
  let scenario = "light";
  let reset: ResetMode = "never";
  const separatorIndex = argv.indexOf("--");

  if (separatorIndex === -1 || separatorIndex === argv.length - 1) {
    throw new Error(
      "Usage: tsx testing/run-with-test-db.ts [--scenario=light|full] [--reset=never|always] -- <command> [...args]"
    );
  }

  for (const arg of argv.slice(0, separatorIndex)) {
    if (arg.startsWith("--scenario=")) {
      scenario = arg.split("=")[1] || scenario;
    } else if (arg.startsWith("--reset=")) {
      const value = arg.split("=")[1];
      if (value === "never" || value === "always") {
        reset = value;
      } else {
        throw new Error(`Unsupported reset mode: ${value}`);
      }
    }
  }

  const [command, ...args] = argv.slice(separatorIndex + 1);
  if (!command) {
    throw new Error("Missing command after --");
  }

  return {
    scenario,
    reset,
    command,
    args,
  };
}

async function main(): Promise<void> {
  const { scenario, reset, command, args } = parseArgs(process.argv.slice(2));
  const localUrl = "mysql://root:rootpassword@127.0.0.1:3307/terp-test";
  const childEnv = {
    ...process.env,
    TEST_DATABASE_URL:
      process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || localUrl,
    DATABASE_URL:
      process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || localUrl,
  };

  if (process.env.SKIP_LOCAL_DB_BOOTSTRAP !== "1") {
    process.env.TEST_DATABASE_URL = childEnv.TEST_DATABASE_URL;
    process.env.DATABASE_URL = childEnv.DATABASE_URL;
    await ensureTestDatabase({
      scenario,
      reset: reset === "always",
    });
  }

  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: childEnv,
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

main().catch(error => {
  console.error("❌ Failed to run command with local test DB bootstrap:", error);
  process.exit(1);
});
