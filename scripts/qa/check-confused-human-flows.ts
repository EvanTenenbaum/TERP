#!/usr/bin/env tsx

import {
  buildChainSummaries,
  buildGeneratedFlows,
  buildOracleSummaries,
  INTENTIONALLY_UNRESOLVED_MATRIX_ROLES,
  loadMatrixRows,
  resolveRoleFixtureLabel,
} from "./generate-confused-human-flows.ts";

function assertCondition(
  condition: boolean,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function snapshotAnchors(
  packet: ReturnType<typeof buildGeneratedFlows>
): string {
  return JSON.stringify(
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
      }))
  );
}

function main(): void {
  const { rows } = loadMatrixRows(null);
  const chainSummaries = buildChainSummaries();
  const oracleSummaries = buildOracleSummaries();

  const unresolvedRoles = new Set(
    rows.flatMap(row =>
      row.roles.filter(role => !resolveRoleFixtureLabel(row, role))
    )
  );
  const expectedUnresolvedRoles = [
    ...INTENTIONALLY_UNRESOLVED_MATRIX_ROLES,
  ].sort();

  assertCondition(
    JSON.stringify([...unresolvedRoles].sort()) ===
      JSON.stringify(expectedUnresolvedRoles),
    `Unexpected unresolved matrix roles: ${[...unresolvedRoles].sort().join(", ")}`
  );

  const managerReturnsRow = rows.find(
    row => row.domain === "Returns" && row.roles.includes("Manager")
  );
  if (!managerReturnsRow) {
    throw new Error("Missing Returns manager row for alias check.");
  }
  assertCondition(
    resolveRoleFixtureLabel(managerReturnsRow, "Manager") === "Sales Manager",
    "Expected Returns manager flows to use the Sales Manager QA fixture."
  );

  const purchasingRow = rows.find(
    row => row.domain === "Purchase Orders" && row.roles.includes("Purchasing")
  );
  if (!purchasingRow) {
    throw new Error("Missing Purchase Orders purchasing row for alias check.");
  }
  assertCondition(
    resolveRoleFixtureLabel(purchasingRow, "Purchasing") ===
      "Inventory Manager",
    "Expected Purchasing flows to use the Inventory Manager QA fixture."
  );

  const adminConfigurationRow = rows.find(
    row => row.domain === "Configuration" && row.roles.includes("Admin")
  );
  if (!adminConfigurationRow) {
    throw new Error("Missing Configuration admin row for alias check.");
  }
  assertCondition(
    resolveRoleFixtureLabel(adminConfigurationRow, "Admin") === "Super Admin",
    "Expected Admin flows to use the Super Admin QA fixture."
  );

  const primaryPacket = buildGeneratedFlows(
    rows,
    chainSummaries,
    oracleSummaries,
    {
      count: 24,
      seed: 20260327,
      anchors: 8,
      domains: null,
      format: "json",
      includePermissionProbes: true,
    }
  );

  assertCondition(
    primaryPacket.candidateRows > 0,
    "No client-wired rows were loaded."
  );
  assertCondition(
    primaryPacket.selectedCount === 24,
    `Expected 24 generated runs, received ${primaryPacket.selectedCount}.`
  );
  assertCondition(
    primaryPacket.anchors === 8,
    `Expected 8 anchors, received ${primaryPacket.anchors}.`
  );
  assertCondition(
    primaryPacket.flows.some(flow => flow.executor !== "manual"),
    "Expected at least one non-manual executor in the packet."
  );
  assertCondition(
    primaryPacket.summary.permissionProbes >= 1,
    "Expected at least one permission probe in the primary packet."
  );
  assertCondition(
    primaryPacket.flows.every(
      flow =>
        flow.matrixKey.length > 0 &&
        flow.entryPath.length > 0 &&
        flow.role.length > 0 &&
        flow.mistakePattern.length > 0
    ),
    "One or more generated flows had missing core fields."
  );
  assertCondition(
    primaryPacket.flows.every(
      flow =>
        flow.mistakePattern !== "Permission probe" ||
        flow.roleMode === "permission-probe"
    ),
    "Found a permission-probe flow whose role mode was not permission-probe."
  );

  const noProbePacket = buildGeneratedFlows(
    rows,
    chainSummaries,
    oracleSummaries,
    {
      count: 24,
      seed: 20260327,
      anchors: 8,
      domains: null,
      format: "json",
      includePermissionProbes: false,
    }
  );

  assertCondition(
    noProbePacket.summary.permissionProbes === 0,
    "Permission probes were still counted when they were disabled."
  );
  assertCondition(
    noProbePacket.flows.every(
      flow => flow.mistakePattern !== "Permission probe"
    ),
    "Found a permission-probe mistake pattern even though probes were disabled."
  );

  const anchorOnlyPacket = buildGeneratedFlows(
    rows,
    chainSummaries,
    oracleSummaries,
    {
      count: 4,
      seed: 42,
      anchors: 4,
      domains: null,
      format: "json",
      includePermissionProbes: true,
    }
  );
  const mixedPacket = buildGeneratedFlows(
    rows,
    chainSummaries,
    oracleSummaries,
    {
      count: 8,
      seed: 42,
      anchors: 4,
      domains: null,
      format: "json",
      includePermissionProbes: true,
    }
  );

  assertCondition(
    snapshotAnchors(anchorOnlyPacket) === snapshotAnchors(mixedPacket),
    "Anchor scenarios changed when count changed with the same seed."
  );

  console.info("Confused human flow check passed.");
  console.info(
    `rows=${primaryPacket.candidateRows} selected=${primaryPacket.selectedCount} anchors=${primaryPacket.anchors} probes=${primaryPacket.summary.permissionProbes}`
  );
}

main();
