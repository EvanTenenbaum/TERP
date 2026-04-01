#!/usr/bin/env tsx

import { existsSync, readFileSync } from "node:fs";
import {
  buildConfusedHumanPacket,
  parseGeneratorArgs,
  renderPacketText,
  validateConfusedHumanPacket,
  type ConfusedHumanPacket,
} from "./confused-human-flow-lib";

const HELP_TEXT = `Usage:
  pnpm qa:human:flows:check -- --file qa-results/confused-human/packet-20260401.json
  pnpm qa:human:flows:check -- --count 40 --seed 20260401

Options:
  --file <path>       Validate an existing packet JSON file
  --count <number>    Regenerate and validate a packet when --file is not provided
  --seed <value>      Deterministic seed for regenerated packets
  --help              Show this help text
`;

const argv = process.argv.slice(2).filter(arg => arg !== "--");

if (argv.includes("--help") || argv.includes("-h")) {
  console.info(HELP_TEXT);
  process.exit(0);
}

const fileArgIndex = argv.indexOf("--file");
const filePath = fileArgIndex === -1 ? undefined : argv[fileArgIndex + 1];

let packet: ConfusedHumanPacket;

if (fileArgIndex !== -1 && !filePath) {
  console.error("Missing value for --file");
  process.exit(1);
}

if (filePath) {
  if (!existsSync(filePath)) {
    console.error(`Packet file not found: ${filePath}`);
    process.exit(1);
  }

  try {
    packet = JSON.parse(readFileSync(filePath, "utf8")) as ConfusedHumanPacket;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to read packet file ${filePath}: ${message}`);
    process.exit(1);
  }
} else {
  const options = parseGeneratorArgs(argv);
  packet = buildConfusedHumanPacket({
    rootDir: options.rootDir,
    count: options.count,
    seed: options.seed,
  });
}

const validation = validateConfusedHumanPacket(packet);
console.info(renderPacketText(packet));

if (!validation.valid) {
  console.error("Packet validation failed:");
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.info("Packet validation passed.");
