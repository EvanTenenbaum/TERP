// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  buildConfusedHumanPacket,
  parseGeneratorArgs,
  renderPacketText,
  validateConfusedHumanPacket,
} from "./confused-human-flow-lib";

describe("generate-confused-human-flows", () => {
  it("parses CLI flags into generator options", () => {
    const options = parseGeneratorArgs([
      "--count",
      "5",
      "--seed",
      "20260408",
      "--format",
      "json",
      "--output",
      "qa-results/confused-human/packet-20260408.json",
    ]);

    expect(options.count).toBe(5);
    expect(options.seed).toBe("20260408");
    expect(options.format).toBe("json");
    expect(options.output).toBe(
      "qa-results/confused-human/packet-20260408.json"
    );
  });

  it("falls back to safe defaults for invalid CLI values", () => {
    const options = parseGeneratorArgs(["--count", "0", "--format", "xml"]);

    expect(options.count).toBe(12);
    expect(options.format).toBe("text");
  });

  it("builds a valid packet from repo sources", () => {
    const packet = buildConfusedHumanPacket({
      rootDir: process.cwd(),
      count: 6,
      seed: "20260408",
      format: "text",
    });

    const validation = validateConfusedHumanPacket(packet);

    expect(packet.selectedCount).toBe(6);
    expect(packet.selected).toHaveLength(6);
    expect(packet.candidateCount).toBeGreaterThan(0);
    expect(validation.valid).toBe(true);
  });

  it("renders human-readable packet text", () => {
    const packet = buildConfusedHumanPacket({
      rootDir: process.cwd(),
      count: 3,
      seed: "20260408",
      format: "text",
    });

    const rendered = renderPacketText(packet);

    expect(rendered).toContain("Run ID:");
    expect(rendered).toContain("Seed: 20260408");
    expect(rendered).toContain("Generated runs: 3");
  });
});
