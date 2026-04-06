// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";

import {
  buildChainSummaries,
  buildGeneratedFlows,
  buildOracleSummaries,
  INTENTIONALLY_UNRESOLVED_MATRIX_ROLES,
  loadMatrixRows,
  normalizeToken,
  parseArgs,
  resolveRoleFixtureLabel,
} from "./generate-confused-human-flows.ts";

describe("generate-confused-human-flows", () => {
  let rows: ReturnType<typeof loadMatrixRows>["rows"];
  let chainSummaries: ReturnType<typeof buildChainSummaries>;
  let oracleSummaries: ReturnType<typeof buildOracleSummaries>;

  beforeAll(() => {
    rows = loadMatrixRows(null).rows;
    chainSummaries = buildChainSummaries();
    oracleSummaries = buildOracleSummaries();
  });

  it("normalizes seeds and ignores a standalone double-dash", () => {
    const options = parseArgs([
      "--",
      "--count",
      "5",
      "--seed",
      "4294967297",
      "--no-permission-probes",
    ]);

    expect(options.count).toBe(5);
    expect(options.seed).toBe(1);
    expect(options.includePermissionProbes).toBe(false);
  });

  it("keeps short domain-critical tokens for matching", () => {
    expect(normalizeToken("VIP PO id order")).toEqual(
      expect.arrayContaining(["vip", "po", "id", "order"])
    );
  });

  it("maps generic internal roles onto the closest seeded QA fixture", () => {
    expect(
      resolveRoleFixtureLabel(
        {
          domain: "Returns",
          entity: "Returns",
          flowName: "Approve Return",
          archetype: "Action",
          procedure: "returns.approve",
          type: "mutation",
          permissions: "returns:update",
          roles: ["Manager"],
          entryPaths: ["/returns"],
          businessPurpose: "Approve a return",
          implementationStatus: "Client-wired",
          knownIssues: "",
          routerFile: "server/routers/returns.ts",
          key: "Returns|Returns|Approve Return|returns.approve",
        },
        "Manager"
      )
    ).toBe("Sales Manager");
    expect(
      resolveRoleFixtureLabel(
        {
          domain: "Purchase Orders",
          entity: "PO Core",
          flowName: "Create PO",
          archetype: "Create",
          procedure: "purchaseOrders.create",
          type: "mutation",
          permissions: "purchaseOrders:create",
          roles: ["Purchasing"],
          entryPaths: ["/purchase-orders/new"],
          businessPurpose: "Create purchase orders",
          implementationStatus: "Client-wired",
          knownIssues: "",
          routerFile: "server/routers/purchaseOrders.ts",
          key: "Purchase Orders|PO Core|Create PO|purchaseOrders.create",
        },
        "Purchasing"
      )
    ).toBe("Inventory Manager");
    expect(
      resolveRoleFixtureLabel(
        {
          domain: "Configuration",
          entity: "Configuration",
          flowName: "Set Value",
          archetype: "Update",
          procedure: "configuration.setValue",
          type: "mutation",
          permissions: "configuration:update",
          roles: ["Admin"],
          entryPaths: ["/settings/configuration"],
          businessPurpose: "Set config value",
          implementationStatus: "Client-wired",
          knownIssues: "",
          routerFile: "server/routers/configuration.ts",
          key: "Configuration|Configuration|Set Value|configuration.setValue",
        },
        "Admin"
      )
    ).toBe("Super Admin");
  });

  it("leaves external personas unresolved instead of faking an internal QA fixture", () => {
    expect(INTENTIONALLY_UNRESOLVED_MATRIX_ROLES.has("VIP Client")).toBe(true);
    expect(
      resolveRoleFixtureLabel(
        {
          domain: "VIP Portal",
          entity: "VIP Core",
          flowName: "Get Summary",
          archetype: "View/Search",
          procedure: "vipPortal.getSummary",
          type: "query",
          permissions: "vipPortal:read",
          roles: ["VIP Client"],
          entryPaths: ["/vip-portal/dashboard"],
          businessPurpose: "Get VIP summary",
          implementationStatus: "Client-wired",
          knownIssues: "",
          routerFile: "server/routers/vipPortal.ts",
          key: "VIP Portal|VIP Core|Get Summary|vipPortal.getSummary",
        },
        "VIP Client"
      )
    ).toBeUndefined();
  });

  it("marks unknown role fixtures as super-admin fallback", () => {
    const packet = buildGeneratedFlows(
      [
        {
          domain: "Orders",
          entity: "Fallback",
          flowName: "Review Fallback",
          archetype: "View/Search",
          procedure: "orders.reviewFallback",
          type: "query",
          permissions: "read",
          roles: ["Mystery Role"],
          entryPaths: ["/orders"],
          businessPurpose: "Review fallback behavior",
          implementationStatus: "Client-wired",
          knownIssues: "",
          routerFile: "server/routers/orders.ts",
          key: "Orders|Fallback|Review Fallback|orders.reviewFallback",
        },
      ],
      [],
      [],
      {
        count: 1,
        seed: 123,
        anchors: 1,
        domains: null,
        format: "json",
        includePermissionProbes: true,
      }
    );

    expect(packet.flows).toHaveLength(1);
    expect(packet.flows[0]?.roleMode).toBe("super-admin-fallback");
    expect(packet.flows[0]?.role).toBe("Super Admin");
    expect(packet.flows[0]?.qaRole).toBe("SuperAdmin");
  });

  it("keeps anchor scenarios stable when count changes", () => {
    const anchorOnlyPacket = buildGeneratedFlows(rows, chainSummaries, oracleSummaries, {
      count: 4,
      seed: 42,
      anchors: 4,
      domains: null,
      format: "json",
      includePermissionProbes: true,
    });
    const mixedPacket = buildGeneratedFlows(rows, chainSummaries, oracleSummaries, {
      count: 8,
      seed: 42,
      anchors: 4,
      domains: null,
      format: "json",
      includePermissionProbes: true,
    });

    const projectAnchors = (packet: typeof anchorOnlyPacket) =>
      packet.flows
        .filter(flow => flow.anchor)
        .map(flow => ({
          matrixKey: flow.matrixKey,
          device: flow.device,
          personaLens: flow.personaLens,
          mistakePattern: flow.mistakePattern,
          role: flow.role,
          roleMode: flow.roleMode,
          entryPath: flow.entryPath,
        }));

    expect(projectAnchors(anchorOnlyPacket)).toEqual(projectAnchors(mixedPacket));
  });

  it("does not emit permission probes when they are disabled", () => {
    const packet = buildGeneratedFlows(rows, chainSummaries, oracleSummaries, {
      count: 24,
      seed: 20260327,
      anchors: 8,
      domains: null,
      format: "json",
      includePermissionProbes: false,
    });

    expect(packet.summary.permissionProbes).toBe(0);
    expect(packet.flows.every(flow => flow.mistakePattern !== "Permission probe")).toBe(
      true
    );
  });
});
