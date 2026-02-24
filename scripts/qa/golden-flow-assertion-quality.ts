import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

interface Finding {
  file: string;
  line: number;
  message: string;
  snippet: string;
}

interface Rule {
  name: string;
  regex: RegExp;
  message: string;
}

const GOLDEN_FLOW_DIR = path.resolve(process.cwd(), "tests-e2e/golden-flows");
const IGNORE_TOKEN = "e2e-quality-ignore";

const RULES: Rule[] = [
  {
    name: "non-assertive-count-floor",
    regex: /expect\(([\s\S]{0,200}?)\)\s*\.toBeGreaterThanOrEqual\(\s*0\s*\)/g,
    message:
      "Non-assertive count assertion detected: `toBeGreaterThanOrEqual(0)` does not validate behavior.",
  },
  {
    name: "boolean-or-assertion",
    regex:
      /expect\(([\s\S]{0,300}?\|\|[\s\S]{0,300}?)\)\s*\.toBe\(\s*true\s*\)/g,
    message:
      "Broad OR assertion detected. Prefer a concrete business-state assertion or explicit count/state check.",
  },
  {
    name: "truthy-assertion",
    regex: /expect\(([\s\S]{0,220}?)\)\s*\.toBeTruthy\(\s*\)/g,
    message:
      "Generic truthy assertion detected. Prefer explicit business expectations (exact status/count/value).",
  },
];

function getGoldenFlowSpecFiles(): string[] {
  return readdirSync(GOLDEN_FLOW_DIR)
    .filter(name => /^gf-00\d-.*\.spec\.ts$/.test(name))
    .map(name => path.join(GOLDEN_FLOW_DIR, name));
}

function getLineNumber(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function collectFindings(file: string): Finding[] {
  const content = readFileSync(file, "utf-8");
  const findings: Finding[] = [];

  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    let match = rule.regex.exec(content);

    while (match) {
      const matchText = match[0] ?? "";
      if (!matchText.includes(IGNORE_TOKEN)) {
        findings.push({
          file,
          line: getLineNumber(content, match.index),
          message: rule.message,
          snippet: matchText.replace(/\s+/g, " ").trim(),
        });
      }
      match = rule.regex.exec(content);
    }
  }

  return findings;
}

function main(): void {
  const files = getGoldenFlowSpecFiles();
  const findings = files.flatMap(collectFindings);

  if (findings.length === 0) {
    process.stdout.write(
      "PASS: No weak golden-flow assertion patterns detected.\n"
    );
    return;
  }

  process.stderr.write(
    `FAIL: Detected ${findings.length} weak assertion pattern(s) in golden-flow specs.\n`
  );
  for (const finding of findings) {
    process.stderr.write(
      `- ${path.relative(process.cwd(), finding.file)}:${finding.line}\n` +
        `  ${finding.message}\n` +
        `  ${finding.snippet}\n`
    );
  }
  process.exit(1);
}

main();
