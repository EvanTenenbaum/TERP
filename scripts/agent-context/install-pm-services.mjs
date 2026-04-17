import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

function parseArgs(argv) {
  const options = {
    host: "127.0.0.1",
    port: "4317",
    labelPrefix: "com.evantenenbaum.terp",
  };

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
    if (arg === "--launch-agents-dir") {
      options.launchAgentsDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--label-prefix") {
      options.labelPrefix = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--host") {
      options.host = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--port") {
      options.port = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--load") {
      options.load = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
    }
  }

  return options;
}

function plistArray(values) {
  return values.map((value) => `    <string>${value}</string>`).join("\n");
}

function buildPlist({ label, programArguments, workingDirectory, stdoutPath, stderrPath, keepAlive, runAtLoad, startInterval }) {
  const keepAliveValue = keepAlive ? "<true/>" : "<false/>";
  const runAtLoadValue = runAtLoad ? "<true/>" : "<false/>";
  const startIntervalSection = startInterval ? `  <key>StartInterval</key>\n  <integer>${startInterval}</integer>\n` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
${plistArray(programArguments)}
  </array>
  <key>WorkingDirectory</key>
  <string>${workingDirectory}</string>
  <key>RunAtLoad</key>
  ${runAtLoadValue}
  <key>KeepAlive</key>
  ${keepAliveValue}
${startIntervalSection}  <key>StandardOutPath</key>
  <string>${stdoutPath}</string>
  <key>StandardErrorPath</key>
  <string>${stderrPath}</string>
</dict>
</plist>
`;
}

function isDomainUnsupportedError(error) {
  return (
    Number(error?.status) === 125 ||
    String(error?.message || "").includes("Domain does not support specified action")
  );
}

function tryLoadIntoDomain(domain, plistPath, label) {
  try {
    execFileSync("launchctl", ["bootout", domain, plistPath], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    // Ignore bootout failures for first install.
  }

  execFileSync("launchctl", ["bootstrap", domain, plistPath], {
    stdio: "inherit",
  });
  execFileSync("launchctl", ["kickstart", "-k", `${domain}/${label}`], {
    stdio: "inherit",
  });

  return domain;
}

function loadService(plistPath, label) {
  const uid = process.getuid();
  const candidateDomains = [`gui/${uid}`, `user/${uid}`];
  let lastError;

  for (const domain of candidateDomains) {
    try {
      return tryLoadIntoDomain(domain, plistPath, label);
    } catch (error) {
      lastError = error;
      if (domain === candidateDomains[0] && isDomainUnsupportedError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

function buildServices({ repoRoot, host, port, labelPrefix, logDir, nodeBin }) {
  const agentScriptsDir = path.join(repoRoot, "scripts", "agent-context");
  return [
    {
      label: `${labelPrefix}.pm-mcp-http`,
      fileName: `${labelPrefix}.pm-mcp-http.plist`,
      plist: buildPlist({
        label: `${labelPrefix}.pm-mcp-http`,
        programArguments: [
          nodeBin,
          path.join(agentScriptsDir, "pm-mcp-server.mjs"),
          "--repo-root",
          repoRoot,
          "--transport",
          "http",
          "--host",
          host,
          "--port",
          port,
        ],
        workingDirectory: repoRoot,
        keepAlive: true,
        runAtLoad: true,
        stdoutPath: path.join(logDir, "pm-mcp-http.out.log"),
        stderrPath: path.join(logDir, "pm-mcp-http.err.log"),
      }),
    },
    {
      label: `${labelPrefix}.pm-linear-reconciler`,
      fileName: `${labelPrefix}.pm-linear-reconciler.plist`,
      plist: buildPlist({
        label: `${labelPrefix}.pm-linear-reconciler`,
        programArguments: [nodeBin, path.join(agentScriptsDir, "pm-linear-reconciler.mjs"), "--repo-root", repoRoot],
        workingDirectory: repoRoot,
        keepAlive: false,
        runAtLoad: true,
        startInterval: 300,
        stdoutPath: path.join(logDir, "pm-linear-reconciler.out.log"),
        stderrPath: path.join(logDir, "pm-linear-reconciler.err.log"),
      }),
    },
    {
      label: `${labelPrefix}.pm-publisher`,
      fileName: `${labelPrefix}.pm-publisher.plist`,
      plist: buildPlist({
        label: `${labelPrefix}.pm-publisher`,
        programArguments: [nodeBin, path.join(agentScriptsDir, "pm-publisher.mjs"), "--repo-root", repoRoot],
        workingDirectory: repoRoot,
        keepAlive: false,
        runAtLoad: true,
        startInterval: 300,
        stdoutPath: path.join(logDir, "pm-publisher.out.log"),
        stderrPath: path.join(logDir, "pm-publisher.err.log"),
      }),
    },
    {
      label: `${labelPrefix}.pm-context-refresh`,
      fileName: `${labelPrefix}.pm-context-refresh.plist`,
      plist: buildPlist({
        label: `${labelPrefix}.pm-context-refresh`,
        programArguments: [
          nodeBin,
          path.join(agentScriptsDir, "generate-agent-context.mjs"),
          "--repo-root",
          repoRoot,
          "--reason",
          "launchd-backstop",
        ],
        workingDirectory: repoRoot,
        keepAlive: false,
        runAtLoad: true,
        startInterval: 600,
        stdoutPath: path.join(logDir, "pm-context-refresh.out.log"),
        stderrPath: path.join(logDir, "pm-context-refresh.err.log"),
      }),
    },
  ];
}

function ensureRequiredPath(targetPath, description) {
  if (!existsSync(targetPath)) {
    throw new Error(`${description} does not exist: ${targetPath}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const launchAgentsDir = path.resolve(options.outputDir || options.launchAgentsDir || path.join(os.homedir(), "Library", "LaunchAgents"));
  const logDir = path.join(os.homedir(), "Library", "Logs", "terp-pm");
  const nodeBin = process.execPath;

  if (options.load && options.dryRun) {
    throw new Error("Cannot combine --load with --dry-run.");
  }

  ensureRequiredPath(path.join(repoRoot, "scripts", "agent-context", "pm-mcp-server.mjs"), "pm-mcp server script");
  ensureRequiredPath(path.join(repoRoot, "scripts", "agent-context", "pm-publisher.mjs"), "pm-publisher script");
  ensureRequiredPath(path.join(repoRoot, "scripts", "agent-context", "pm-linear-reconciler.mjs"), "pm-linear-reconciler script");
  ensureRequiredPath(path.join(repoRoot, "scripts", "agent-context", "generate-agent-context.mjs"), "context generator script");

  mkdirSync(launchAgentsDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });

  const services = buildServices({
    repoRoot,
    host: options.host,
    port: options.port,
    labelPrefix: options.labelPrefix,
    logDir,
    nodeBin,
  });

  const written = [];
  for (const service of services) {
    const plistPath = path.join(launchAgentsDir, service.fileName);
    writeFileSync(plistPath, service.plist);
    written.push({
      label: service.label,
      plistPath,
    });
    if (options.load) {
      const domain = loadService(plistPath, service.label);
      written[written.length - 1].domain = domain;
    }
  }

  console.info(
    JSON.stringify(
      {
        status: options.dryRun ? "dry-run" : options.load ? "installed-and-loaded" : "installed",
        repoRoot,
        launchAgentsDir,
        logDir,
        host: options.host,
        port: options.port,
        services: written,
      },
      null,
      2,
    ),
  );
}

main();
