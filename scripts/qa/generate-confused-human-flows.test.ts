// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  buildConfusedHumanPacket,
  parseGeneratorArgs,
  validateConfusedHumanPacket,
} from "./confused-human-flow-lib";

describe("generate-confused-human-flows", () => {
  it("parses count and seed flags", () => {
    const options = parseGeneratorArgs(["--count", "5", "--seed", "20260401"]);
    expect(options.count).toBe(5);
    expect(options.seed).toBe("20260401");
  });

  it("falls back to default count when flag is absent", () => {
    const options = parseGeneratorArgs(["--seed", "20260401"]);
    expect(options.count).toBe(12);
  });

  it("clamps an invalid count to the default", () => {
    const options = parseGeneratorArgs(["--count", "0", "--seed", "s"]);
    expect(options.count).toBe(12);
  });

  it("parses json format flag", () => {
    const options = parseGeneratorArgs(["--format", "json", "--seed", "s"]);
    expect(options.format).toBe("json");
  });

  it("defaults to text format when flag is absent", () => {
    const options = parseGeneratorArgs(["--seed", "s"]);
    expect(options.format).toBe("text");
  });

  it("parses output path flag", () => {
    const options = parseGeneratorArgs([
      "--output",
      "out/packet.json",
      "--seed",
      "s",
    ]);
    expect(options.output).toBe("out/packet.json");
  });

  it("generates a valid packet for a given seed", () => {
    const packet = buildConfusedHumanPacket({
      rootDir: process.cwd(),
      count: 5,
      seed: "20260401",
    });
    const validation = validateConfusedHumanPacket(packet);
    expect(packet.selected.length).toBe(packet.selectedCount);
    expect(packet.candidateCount).toBeGreaterThan(0);
    expect(validation.valid).toBe(true);
  });

  it("produces stable output for the same seed", () => {
    const opts = { rootDir: process.cwd(), count: 4, seed: "stability-test" };
    const packet1 = buildConfusedHumanPacket(opts);
    const packet2 = buildConfusedHumanPacket(opts);
    // Same seed → same selected run IDs in the same order
    expect(packet1.selected.map(r => r.flowName)).toEqual(
      packet2.selected.map(r => r.flowName)
    );
  });
});
