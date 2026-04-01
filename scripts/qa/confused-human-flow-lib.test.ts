import { describe, expect, it } from "vitest";
import {
  buildConfusedHumanPacket,
  validateConfusedHumanPacket,
} from "./confused-human-flow-lib";

describe("confused human flow generator", () => {
  it("builds a replayable packet from repo sources", () => {
    const packet = buildConfusedHumanPacket({
      rootDir: process.cwd(),
      count: 8,
      seed: "20260401",
    });

    const validation = validateConfusedHumanPacket(packet);

    expect(packet.candidateCount).toBeGreaterThan(0);
    expect(packet.selectedCount).toBeGreaterThan(0);
    expect(packet.selected.length).toBe(packet.selectedCount);
    expect(validation.valid).toBe(true);
  });
});
