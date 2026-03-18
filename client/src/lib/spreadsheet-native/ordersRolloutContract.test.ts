import { describe, expect, it } from "vitest";
import {
  ordersRolloutRequirementById,
  ordersRolloutRequirementIds,
  ordersRolloutRequirements,
} from "./ordersRolloutContract";
import { pilotProofDefinitions } from "./pilotProofCases";

describe("orders rollout contract", () => {
  it("defines unique requirement rows with implementation and proof sources", () => {
    expect(new Set(ordersRolloutRequirementIds).size).toBe(
      ordersRolloutRequirementIds.length
    );

    for (const requirement of ordersRolloutRequirements) {
      expect(requirement.implementationSource.length).toBeGreaterThan(0);
      expect(requirement.proofSource.length).toBeGreaterThan(0);
      expect(requirement.linkedCapabilityIds.length).toBeGreaterThan(0);
    }
  });

  it("covers workflow, spreadsheet interaction, and surfacing groups", () => {
    const groups = new Set(
      ordersRolloutRequirements.map(requirement => requirement.group)
    );

    expect(groups).toEqual(
      new Set([
        "workflow-parity",
        "spreadsheet-interaction",
        "surfacing-discoverability",
      ])
    );
  });

  it("maps every linked capability id to a proof definition", () => {
    const proofIds = new Set(
      pilotProofDefinitions
        .filter(definition => definition.capabilityId.startsWith("SALE-ORD-"))
        .map(definition => definition.capabilityId)
    );

    for (const requirement of ordersRolloutRequirements) {
      for (const capabilityId of requirement.linkedCapabilityIds) {
        expect(proofIds.has(capabilityId)).toBe(true);
      }
    }
  });

  it("does not leave open requirements without at least one unfinished proof row", () => {
    const proofById = new Map(
      pilotProofDefinitions.map(definition => [
        definition.capabilityId,
        definition,
      ])
    );

    for (const requirement of ordersRolloutRequirements) {
      if (requirement.releaseStatus !== "open") {
        continue;
      }

      const linkedProofs = requirement.linkedCapabilityIds.map(capabilityId =>
        proofById.get(capabilityId)
      );

      expect(linkedProofs.every(Boolean)).toBe(true);
      expect(
        linkedProofs.some(
          proof =>
            (proof?.implementationStatus ?? "not-started") === "not-started"
        )
      ).toBe(true);
    }
  });

  it("exposes the anti-drift release gates for spreadsheet behavior and surfacing", () => {
    for (const requirementId of [
      "ORD-WF-008",
      "ORD-WF-009",
      "ORD-SS-001",
      "ORD-SS-006",
      "ORD-SS-008",
      "ORD-SS-010",
      "ORD-SS-011",
      "ORD-SS-012",
      "ORD-SF-001",
      "ORD-SF-006",
      "ORD-SF-007",
      "ORD-SF-008",
      "ORD-SF-009",
    ]) {
      expect(ordersRolloutRequirementById.has(requirementId)).toBe(true);
    }
  });
});
