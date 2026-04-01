#!/usr/bin/env tsx

import {
  buildConfusedHumanPacket,
  parseGeneratorArgs,
  renderPacketText,
  validateConfusedHumanPacket,
  writePacketJson,
} from "./confused-human-flow-lib";

const HELP_TEXT = `Usage:
  pnpm qa:human:flows -- --count 40 --seed 20260401
  pnpm qa:human:flows -- --count 60 --seed 20260401 --format json --output qa-results/confused-human/packet-20260401.json

Options:
  --count <number>    Number of runs to generate (default: 12)
  --seed <value>      Deterministic seed for replayable packets
  --format <text|json>
                      Output format (default: text)
  --output <path>     JSON output path when --format json is used
  --help              Show this help text
`;

const argv = process.argv.slice(2).filter(arg => arg !== "--");

if (argv.includes("--help") || argv.includes("-h")) {
  console.info(HELP_TEXT);
  process.exit(0);
}

const options = parseGeneratorArgs(argv);
const packet = buildConfusedHumanPacket(options);
const validation = validateConfusedHumanPacket(packet);

if (!validation.valid) {
  console.error(renderPacketText(packet));
  console.error("Validation errors:");
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (options.format === "json") {
  if (options.output) {
    writePacketJson(packet, options.output);
    console.info(`Wrote confused-human packet to ${options.output}`);
  } else {
    console.info(JSON.stringify(packet, null, 2));
  }
} else {
  console.info(renderPacketText(packet));
}
