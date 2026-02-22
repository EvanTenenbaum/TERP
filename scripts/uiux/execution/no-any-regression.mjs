#!/usr/bin/env node

import { execSync } from "child_process";

const fileArgs = process.argv.slice(2).filter(arg => arg.trim().length > 0);
if (fileArgs.length === 0) {
  console.error(
    "Usage: node scripts/uiux/execution/no-any-regression.mjs <file> [file...]"
  );
  process.exit(1);
}

let diffText = "";
try {
  diffText = execSync(
    `git diff --no-color --unified=0 -- ${fileArgs.map(file => `"${file}"`).join(" ")}`,
    { encoding: "utf8" }
  );
} catch (error) {
  diffText = error?.stdout?.toString?.() || "";
}

const findings = [];
const lines = diffText.split("\n");
let currentFile = "";
let currentNewLine = 0;

for (const line of lines) {
  if (line.startsWith("+++ b/")) {
    currentFile = line.slice("+++ b/".length);
    continue;
  }

  const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (hunk) {
    currentNewLine = Number(hunk[1]);
    continue;
  }

  if (!line.startsWith("+") || line.startsWith("+++")) {
    if (line.startsWith(" ")) {
      currentNewLine += 1;
    }
    continue;
  }

  const addedLine = line.slice(1);
  const patterns = [
    {
      id: "no-explicit-any",
      regex: /(^|[^A-Za-z0-9_])any([^A-Za-z0-9_]|$)/,
      ignore: /\bmany\b/i,
    },
    { id: "ts-ignore", regex: /@ts-ignore/ },
    {
      id: "eslint-disable-any",
      regex: /eslint-disable[^\n]*@typescript-eslint\/no-explicit-any/,
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(addedLine) && !(pattern.ignore?.test(addedLine) ?? false)) {
      findings.push({
        file: currentFile,
        line: currentNewLine,
        rule: pattern.id,
        content: addedLine.trim(),
      });
      break;
    }
  }

  currentNewLine += 1;
}

if (findings.length > 0) {
  console.error("Found new typing debt in added lines:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.rule}] ${finding.content}`
    );
  }
  process.exit(1);
}

console.log("No new explicit any/ignore debt detected in added lines.");
