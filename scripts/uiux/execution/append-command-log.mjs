#!/usr/bin/env node

import fs from "fs";
import path from "path";

function getArg(name) {
  const key = `--${name}`;
  const keyEq = `${key}=`;
  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === key && process.argv[i + 1]) return process.argv[i + 1];
    if (arg.startsWith(keyEq)) return arg.slice(keyEq.length);
  }
  return undefined;
}

const taskDir = getArg("task-dir");
const command = getArg("command");
const exitCode = getArg("exit-code") ?? "0";

if (!taskDir || !command) {
  console.error(
    "Usage: node scripts/uiux/execution/append-command-log.mjs --task-dir <path> --command \"<cmd>\" [--exit-code 0]"
  );
  process.exit(1);
}

const commandsLogPath = path.join(taskDir, "commands.log");
if (!fs.existsSync(path.dirname(commandsLogPath))) {
  console.error(`Task directory does not exist: ${taskDir}`);
  process.exit(1);
}

const stamp = new Date().toISOString();
const entry = `[${stamp}] exit=${exitCode} cmd=${command}\n`;
fs.appendFileSync(commandsLogPath, entry, "utf8");
console.log(commandsLogPath);
