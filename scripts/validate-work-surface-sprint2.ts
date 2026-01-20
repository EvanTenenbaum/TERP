#!/usr/bin/env ts-node
/**
 * Gate 2 Validation Script - Work Surface Sprint 2
 *
 * Validates all Sprint 2 deliverables:
 * - UXS-301: Orders Work Surface
 * - UXS-401: Inventory Work Surface
 * - UXS-501: Invoices Work Surface
 * - UXS-705: Concurrent Edit Detection
 * - UXS-701: Feature Flags
 *
 * @see docs/specs/ui-ux-strategy/ATOMIC_ROADMAP.md
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: ValidationResult[] = [];
const clientDir = path.join(__dirname, "..", "client", "src");
const componentsDir = path.join(clientDir, "components", "work-surface");
const hooksDir = path.join(clientDir, "hooks", "work-surface");

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function fileContains(filePath: string, patterns: string[]): boolean {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf-8");
  return patterns.every((pattern) => content.includes(pattern));
}

function addResult(name: string, passed: boolean, message: string): void {
  results.push({ name, passed, message });
}

// ============================================================================
// UXS-301: Orders Work Surface Validation
// ============================================================================

function validateOrdersWorkSurface(): void {
  const filePath = path.join(componentsDir, "OrdersWorkSurface.tsx");

  if (!fileExists(filePath)) {
    addResult("UXS-301", false, "OrdersWorkSurface.tsx not found");
    return;
  }

  const requiredPatterns = [
    "useWorkSurfaceKeyboard",
    "useSaveState",
    "InspectorPanel",
    "keyboardProps",
    "SaveStateIndicator",
    "inspector.open",
    "inspector.close",
    "trpc.orders",
  ];

  if (!fileContains(filePath, requiredPatterns)) {
    addResult(
      "UXS-301",
      false,
      "OrdersWorkSurface missing required Work Surface patterns"
    );
    return;
  }

  addResult(
    "UXS-301",
    true,
    "Orders Work Surface has all required patterns"
  );
}

// ============================================================================
// UXS-401: Inventory Work Surface Validation
// ============================================================================

function validateInventoryWorkSurface(): void {
  const filePath = path.join(componentsDir, "InventoryWorkSurface.tsx");

  if (!fileExists(filePath)) {
    addResult("UXS-401", false, "InventoryWorkSurface.tsx not found");
    return;
  }

  const requiredPatterns = [
    "useWorkSurfaceKeyboard",
    "useSaveState",
    "InspectorPanel",
    "keyboardProps",
    "SaveStateIndicator",
    "inspector.open",
    "inspector.close",
  ];

  if (!fileContains(filePath, requiredPatterns)) {
    addResult(
      "UXS-401",
      false,
      "InventoryWorkSurface missing required Work Surface patterns"
    );
    return;
  }

  addResult(
    "UXS-401",
    true,
    "Inventory Work Surface has all required patterns"
  );
}

// ============================================================================
// UXS-501: Invoices Work Surface Validation
// ============================================================================

function validateInvoicesWorkSurface(): void {
  const filePath = path.join(componentsDir, "InvoicesWorkSurface.tsx");

  if (!fileExists(filePath)) {
    addResult("UXS-501", false, "InvoicesWorkSurface.tsx not found");
    return;
  }

  const requiredPatterns = [
    "useWorkSurfaceKeyboard",
    "useSaveState",
    "InspectorPanel",
    "keyboardProps",
    "SaveStateIndicator",
    "inspector.open",
    "inspector.close",
    "trpc.accounting.invoices",
    "formatCurrency",
    "InvoiceStatusBadge",
  ];

  if (!fileContains(filePath, requiredPatterns)) {
    addResult(
      "UXS-501",
      false,
      "InvoicesWorkSurface missing required Work Surface patterns"
    );
    return;
  }

  addResult(
    "UXS-501",
    true,
    "Invoices Work Surface has all required patterns"
  );
}

// ============================================================================
// UXS-705: Concurrent Edit Detection Validation
// ============================================================================

function validateConcurrentEditDetection(): void {
  const filePath = path.join(hooksDir, "useConcurrentEditDetection.ts");

  if (!fileExists(filePath)) {
    addResult("UXS-705", false, "useConcurrentEditDetection.ts not found");
    return;
  }

  const requiredPatterns = [
    "ConflictInfo",
    "ConflictResolution",
    "handleError",
    "resolveConflict",
    "trackVersion",
    "ConflictDialog",
    "isConflictError",
    "TRPCClientError",
    "CONFLICT",
    "VersionedEntity",
  ];

  if (!fileContains(filePath, requiredPatterns)) {
    addResult(
      "UXS-705",
      false,
      "useConcurrentEditDetection missing required patterns"
    );
    return;
  }

  addResult(
    "UXS-705",
    true,
    "Concurrent Edit Detection hook has all required patterns"
  );
}

// ============================================================================
// UXS-701: Feature Flags Validation
// ============================================================================

function validateFeatureFlags(): void {
  const filePath = path.join(hooksDir, "useWorkSurfaceFeatureFlags.ts");

  if (!fileExists(filePath)) {
    addResult("UXS-701", false, "useWorkSurfaceFeatureFlags.ts not found");
    return;
  }

  const requiredPatterns = [
    "WORK_SURFACE_FLAGS",
    "WORK_SURFACE_ENABLED",
    "KEYBOARD_CONTRACT",
    "SAVE_STATE_INDICATOR",
    "INSPECTOR_PANEL",
    "useFeatureFlags",
    "isWorkSurfaceEnabled",
    "WorkSurfaceGate",
    "hasAnyWorkSurfaceFeature",
    "hasAllFoundationFeatures",
  ];

  if (!fileContains(filePath, requiredPatterns)) {
    addResult(
      "UXS-701",
      false,
      "useWorkSurfaceFeatureFlags missing required patterns"
    );
    return;
  }

  addResult(
    "UXS-701",
    true,
    "Feature Flags hook has all required patterns"
  );
}

// ============================================================================
// INDEX EXPORTS VALIDATION
// ============================================================================

function validateIndexExports(): void {
  // Validate hooks index
  const hooksIndex = path.join(hooksDir, "index.ts");
  if (!fileExists(hooksIndex)) {
    addResult("HOOKS_INDEX", false, "Hooks index.ts not found");
    return;
  }

  const hooksExports = [
    "useWorkSurfaceKeyboard",
    "useSaveState",
    "useValidationTiming",
    "useConcurrentEditDetection",
    "useWorkSurfaceFeatureFlags",
    "isConflictError",
  ];

  if (!fileContains(hooksIndex, hooksExports)) {
    addResult(
      "HOOKS_INDEX",
      false,
      "Hooks index missing required exports"
    );
    return;
  }

  addResult("HOOKS_INDEX", true, "Hooks index exports all required hooks");

  // Validate components index
  const componentsIndex = path.join(componentsDir, "index.ts");
  if (!fileExists(componentsIndex)) {
    addResult("COMPONENTS_INDEX", false, "Components index.ts not found");
    return;
  }

  const componentExports = [
    "InspectorPanel",
    "DirectIntakeWorkSurface",
    "PurchaseOrdersWorkSurface",
    "ClientsWorkSurface",
    "OrdersWorkSurface",
    "InventoryWorkSurface",
    "InvoicesWorkSurface",
  ];

  if (!fileContains(componentsIndex, componentExports)) {
    addResult(
      "COMPONENTS_INDEX",
      false,
      "Components index missing required exports"
    );
    return;
  }

  addResult(
    "COMPONENTS_INDEX",
    true,
    "Components index exports all required Work Surfaces"
  );
}

// ============================================================================
// KEYBOARD CONTRACT COMPLIANCE
// ============================================================================

function validateKeyboardCompliance(): void {
  const workSurfaces = [
    "OrdersWorkSurface.tsx",
    "InventoryWorkSurface.tsx",
    "InvoicesWorkSurface.tsx",
  ];

  const requiredKeyboardPatterns = [
    "arrowdown",
    "arrowup",
    "enter",
    "onCancel",
    "cmd+k", // Focus search
  ];

  let allPass = true;
  const failures: string[] = [];

  for (const surface of workSurfaces) {
    const filePath = path.join(componentsDir, surface);
    if (!fileContains(filePath, requiredKeyboardPatterns)) {
      allPass = false;
      failures.push(surface);
    }
  }

  if (!allPass) {
    addResult(
      "KEYBOARD_COMPLIANCE",
      false,
      `Missing keyboard patterns in: ${failures.join(", ")}`
    );
    return;
  }

  addResult(
    "KEYBOARD_COMPLIANCE",
    true,
    "All Work Surfaces have keyboard contract compliance"
  );
}

// ============================================================================
// INSPECTOR PANEL COMPLIANCE
// ============================================================================

function validateInspectorCompliance(): void {
  const workSurfaces = [
    "OrdersWorkSurface.tsx",
    "InventoryWorkSurface.tsx",
    "InvoicesWorkSurface.tsx",
  ];

  const requiredInspectorPatterns = [
    "useInspectorPanel",
    "InspectorPanel",
    "InspectorSection",
    "isOpen",
    "onClose",
  ];

  let allPass = true;
  const failures: string[] = [];

  for (const surface of workSurfaces) {
    const filePath = path.join(componentsDir, surface);
    if (!fileContains(filePath, requiredInspectorPatterns)) {
      allPass = false;
      failures.push(surface);
    }
  }

  if (!allPass) {
    addResult(
      "INSPECTOR_COMPLIANCE",
      false,
      `Missing inspector patterns in: ${failures.join(", ")}`
    );
    return;
  }

  addResult(
    "INSPECTOR_COMPLIANCE",
    true,
    "All Work Surfaces have inspector panel compliance"
  );
}

// ============================================================================
// MAIN
// ============================================================================

function main(): void {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║         GATE 2 VALIDATION - Work Surface Sprint 2          ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log("║  Validating: UXS-301, UXS-401, UXS-501, UXS-705, UXS-701   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Run validations
  validateOrdersWorkSurface();
  validateInventoryWorkSurface();
  validateInvoicesWorkSurface();
  validateConcurrentEditDetection();
  validateFeatureFlags();
  validateIndexExports();
  validateKeyboardCompliance();
  validateInspectorCompliance();

  // Print results
  console.log("\n┌────────────────────────────────────────────────────────────┐");
  console.log("│                     VALIDATION RESULTS                      │");
  console.log("├────────────────────────────────────────────────────────────┤");

  let passCount = 0;
  let failCount = 0;

  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    if (result.passed) passCount++;
    else failCount++;

    console.log(`│ ${status} │ ${result.name.padEnd(20)} │ ${result.message.slice(0, 30)}`);
  }

  console.log("├────────────────────────────────────────────────────────────┤");
  console.log(`│ Total: ${results.length} │ Passed: ${passCount} │ Failed: ${failCount}                  │`);
  console.log("└────────────────────────────────────────────────────────────┘");

  if (failCount > 0) {
    console.log("\n⚠️  GATE 2 FAILED - Fix the above issues before proceeding\n");
    process.exit(1);
  } else {
    console.log("\n✅ GATE 2 PASSED - Sprint 2 deliverables validated\n");
    console.log("┌────────────────────────────────────────────────────────────┐");
    console.log("│                    READY FOR SPRINT 3                       │");
    console.log("│                                                             │");
    console.log("│  Next Tasks:                                                │");
    console.log("│  • UXS-601: Intake-to-Order Golden Flow                    │");
    console.log("│  • UXS-602: Order-to-Invoice Golden Flow                   │");
    console.log("│  • UXS-603: Invoice-to-Payment Golden Flow                 │");
    console.log("│  • UXS-801: Final Polish & Documentation                   │");
    console.log("└────────────────────────────────────────────────────────────┘\n");
    process.exit(0);
  }
}

main();
