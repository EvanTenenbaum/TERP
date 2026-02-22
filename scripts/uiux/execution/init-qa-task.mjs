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

const phase = getArg("phase");
const taskId = getArg("task-id");
const runDate = getArg("date") || new Date().toISOString().slice(0, 10);

if (!phase || !taskId) {
  console.error(
    "Usage: node scripts/uiux/execution/init-qa-task.mjs --phase <phase> --task-id <task-id> [--date YYYY-MM-DD]"
  );
  process.exit(1);
}

const root = process.cwd();
const taskDir = path.join(root, ".qa", "runs", runDate, phase, taskId);
const screensDir = path.join(taskDir, "screens");

fs.mkdirSync(screensDir, { recursive: true });

const files = [
  "commands.log",
  "verification.md",
  "console.log",
  "network.log",
  "notes.md",
];

for (const file of files) {
  const fullPath = path.join(taskDir, file);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, "", "utf8");
  }
}

const screensKeep = path.join(screensDir, ".gitkeep");
if (!fs.existsSync(screensKeep)) {
  fs.writeFileSync(screensKeep, "", "utf8");
}

const verificationPath = path.join(taskDir, "verification.md");
const verification = fs.readFileSync(verificationPath, "utf8").trim();
if (verification.length === 0) {
  fs.writeFileSync(
    verificationPath,
    [
      "# Verification",
      "",
      "Verdict: INCOMPLETE",
      `Task ID: ${taskId}`,
      `Phase: ${phase}`,
      `Run Date: ${runDate}`,
      "",
      "Evidence:",
      "- commands.log",
      "- console.log",
      "- network.log",
      "- screens/",
      "- notes.md",
      "",
      "Summary:",
      "- Pending execution.",
      "",
    ].join("\n"),
    "utf8"
  );
}

const notesPath = path.join(taskDir, "notes.md");
const notes = fs.readFileSync(notesPath, "utf8").trim();
if (notes.length === 0) {
  fs.writeFileSync(
    notesPath,
    ["# Notes", "", `- Initialized task packet ${taskId}.`, ""].join("\n"),
    "utf8"
  );
}

console.log(taskDir);
