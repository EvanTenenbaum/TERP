#!/usr/bin/env tsx
/**
 * Work Surface Hooks Integration Validation Script
 * Gate 0 Validation for UXS Sprint 0
 *
 * This script validates that all Work Surface foundation hooks are:
 * 1. Properly exported
 * 2. Have correct TypeScript types
 * 3. Include required functionality
 * 4. Have unit tests
 *
 * Run: npx tsx scripts/validate-work-surface-hooks-integration.ts
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ValidationCheck {
  name: string;
  description: string;
  check: () => ValidationResult;
}

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

interface HookSpec {
  filename: string;
  requiredExports: string[];
  requiredTypes: string[];
  testFile: string;
}

const HOOKS_DIR = path.join(process.cwd(), "client/src/hooks/work-surface");
const COMPONENTS_DIR = path.join(process.cwd(), "client/src/components/work-surface");
const TESTS_DIR = path.join(HOOKS_DIR, "__tests__");

const HOOK_SPECS: HookSpec[] = [
  {
    filename: "useWorkSurfaceKeyboard.ts",
    requiredExports: [
      "useWorkSurfaceKeyboard",
      "WorkSurfaceKeyboardOptions",
      "FocusState",
      "UseWorkSurfaceKeyboardReturn",
    ],
    requiredTypes: [
      "onRowCommit",
      "onRowCreate",
      "onCancel",
      "onUndo",
      "isInspectorOpen",
      "onInspectorClose",
      "validateRow",
      "gridMode",
    ],
    testFile: "useWorkSurfaceKeyboard.test.ts",
  },
  {
    filename: "useSaveState.ts",
    requiredExports: [
      "useSaveState",
      "SaveStateStatus",
      "SaveState",
      "UseSaveStateOptions",
      "UseSaveStateReturn",
    ],
    requiredTypes: [
      "saved",
      "saving",
      "error",
      "queued",
      "setSaving",
      "setSaved",
      "setError",
      "setQueued",
      "SaveStateIndicator",
    ],
    testFile: "useSaveState.test.ts",
  },
  {
    filename: "useValidationTiming.ts",
    requiredExports: [
      "useValidationTiming",
      "FieldStatus",
      "FieldState",
      "ValidationState",
      "UseValidationTimingOptions",
      "UseValidationTimingReturn",
    ],
    requiredTypes: [
      "pristine",
      "typing",
      "valid",
      "invalid",
      "handleChange",
      "handleBlur",
      "validateAll",
      "getFieldState",
    ],
    testFile: "useValidationTiming.test.ts",
  },
];

const COMPONENT_SPECS = [
  {
    filename: "InspectorPanel.tsx",
    requiredExports: [
      "InspectorPanel",
      "InspectorSection",
      "InspectorField",
      "InspectorActions",
      "useInspectorPanel",
    ],
    requiredFeatures: [
      "focus trap",
      "Esc to close",
      "slide-over",
      "responsive",
    ],
  },
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function fileExists(filepath: string): boolean {
  try {
    return fs.existsSync(filepath);
  } catch {
    return false;
  }
}

function readFileContent(filepath: string): string {
  try {
    return fs.readFileSync(filepath, "utf-8");
  } catch {
    return "";
  }
}

function checkExports(content: string, exports: string[]): string[] {
  const missing: string[] = [];
  for (const exp of exports) {
    // Check for export function, export const, export interface, export type, export default
    const patterns = [
      new RegExp(`export\\s+(function|const|interface|type|class)\\s+${exp}\\b`),
      new RegExp(`export\\s+\\{[^}]*\\b${exp}\\b[^}]*\\}`),
      new RegExp(`export\\s+default\\s+${exp}\\b`),
    ];
    const found = patterns.some((p) => p.test(content));
    if (!found) {
      missing.push(exp);
    }
  }
  return missing;
}

function checkTypeDefinitions(content: string, types: string[]): string[] {
  const missing: string[] = [];
  for (const type of types) {
    if (!content.includes(type)) {
      missing.push(type);
    }
  }
  return missing;
}

// ============================================================================
// VALIDATION CHECKS
// ============================================================================

const validationChecks: ValidationCheck[] = [
  // Hook existence checks
  {
    name: "Hook Files Exist",
    description: "All Work Surface hook files exist",
    check: () => {
      const missing: string[] = [];
      for (const spec of HOOK_SPECS) {
        const filepath = path.join(HOOKS_DIR, spec.filename);
        if (!fileExists(filepath)) {
          missing.push(spec.filename);
        }
      }
      return {
        passed: missing.length === 0,
        message: missing.length === 0
          ? "All hook files exist"
          : `Missing hook files: ${missing.join(", ")}`,
        details: missing,
      };
    },
  },

  // Hook export checks
  {
    name: "Hook Exports Complete",
    description: "All hooks export required functions and types",
    check: () => {
      const issues: string[] = [];
      for (const spec of HOOK_SPECS) {
        const filepath = path.join(HOOKS_DIR, spec.filename);
        const content = readFileContent(filepath);
        const missing = checkExports(content, spec.requiredExports);
        if (missing.length > 0) {
          issues.push(`${spec.filename}: missing exports [${missing.join(", ")}]`);
        }
      }
      return {
        passed: issues.length === 0,
        message: issues.length === 0
          ? "All hooks export required types and functions"
          : "Some hooks have missing exports",
        details: issues,
      };
    },
  },

  // Hook type definition checks
  {
    name: "Hook Type Definitions",
    description: "All hooks include required type definitions",
    check: () => {
      const issues: string[] = [];
      for (const spec of HOOK_SPECS) {
        const filepath = path.join(HOOKS_DIR, spec.filename);
        const content = readFileContent(filepath);
        const missing = checkTypeDefinitions(content, spec.requiredTypes);
        if (missing.length > 0) {
          issues.push(`${spec.filename}: missing types [${missing.join(", ")}]`);
        }
      }
      return {
        passed: issues.length === 0,
        message: issues.length === 0
          ? "All hooks have required type definitions"
          : "Some hooks have missing type definitions",
        details: issues,
      };
    },
  },

  // Test file existence
  {
    name: "Test Files Exist",
    description: "All hooks have unit test files",
    check: () => {
      const missing: string[] = [];
      for (const spec of HOOK_SPECS) {
        const testPath = path.join(TESTS_DIR, spec.testFile);
        if (!fileExists(testPath)) {
          missing.push(spec.testFile);
        }
      }
      return {
        passed: missing.length === 0,
        message: missing.length === 0
          ? "All hooks have test files"
          : `Missing test files: ${missing.join(", ")}`,
        details: missing,
      };
    },
  },

  // Test file coverage
  {
    name: "Test Coverage Adequate",
    description: "Test files contain sufficient test cases",
    check: () => {
      const issues: string[] = [];
      const MIN_TESTS_PER_HOOK = 5;

      for (const spec of HOOK_SPECS) {
        const testPath = path.join(TESTS_DIR, spec.testFile);
        const content = readFileContent(testPath);
        // Count "it(" occurrences as test count
        const testCount = (content.match(/\bit\(/g) || []).length;
        if (testCount < MIN_TESTS_PER_HOOK) {
          issues.push(`${spec.testFile}: only ${testCount} tests (minimum ${MIN_TESTS_PER_HOOK})`);
        }
      }
      return {
        passed: issues.length === 0,
        message: issues.length === 0
          ? "All hook tests have adequate coverage"
          : "Some hooks have insufficient test coverage",
        details: issues,
      };
    },
  },

  // Component existence
  {
    name: "Component Files Exist",
    description: "All Work Surface component files exist",
    check: () => {
      const missing: string[] = [];
      for (const spec of COMPONENT_SPECS) {
        const filepath = path.join(COMPONENTS_DIR, spec.filename);
        if (!fileExists(filepath)) {
          missing.push(spec.filename);
        }
      }
      return {
        passed: missing.length === 0,
        message: missing.length === 0
          ? "All component files exist"
          : `Missing component files: ${missing.join(", ")}`,
        details: missing,
      };
    },
  },

  // Component exports
  {
    name: "Component Exports Complete",
    description: "All components export required functions",
    check: () => {
      const issues: string[] = [];
      for (const spec of COMPONENT_SPECS) {
        const filepath = path.join(COMPONENTS_DIR, spec.filename);
        const content = readFileContent(filepath);
        const missing = checkExports(content, spec.requiredExports);
        if (missing.length > 0) {
          issues.push(`${spec.filename}: missing exports [${missing.join(", ")}]`);
        }
      }
      return {
        passed: issues.length === 0,
        message: issues.length === 0
          ? "All components export required functions"
          : "Some components have missing exports",
        details: issues,
      };
    },
  },

  // Keyboard contract compliance
  {
    name: "Keyboard Contract Compliance",
    description: "useWorkSurfaceKeyboard implements full keyboard contract",
    check: () => {
      const filepath = path.join(HOOKS_DIR, "useWorkSurfaceKeyboard.ts");
      const content = readFileContent(filepath);
      const requiredKeys = ["Tab", "Enter", "Escape", '"z"'];
      const missing: string[] = [];

      for (const key of requiredKeys) {
        if (!content.includes(key)) {
          missing.push(key);
        }
      }

      return {
        passed: missing.length === 0,
        message: missing.length === 0
          ? "Keyboard contract fully implemented"
          : `Missing keyboard handlers: ${missing.join(", ")}`,
        details: missing,
      };
    },
  },

  // Save state compliance
  {
    name: "Save State Compliance",
    description: "useSaveState implements all 4 states",
    check: () => {
      const filepath = path.join(HOOKS_DIR, "useSaveState.ts");
      const content = readFileContent(filepath);
      const requiredStates = ["saved", "saving", "error", "queued"];
      const missing: string[] = [];

      for (const state of requiredStates) {
        if (!content.includes(`"${state}"`)) {
          missing.push(state);
        }
      }

      return {
        passed: missing.length === 0,
        message: missing.length === 0
          ? "All 4 save states implemented"
          : `Missing save states: ${missing.join(", ")}`,
        details: missing,
      };
    },
  },

  // Validation timing compliance
  {
    name: "Validation Timing Compliance",
    description: "useValidationTiming implements 'Reward Early, Punish Late' pattern",
    check: () => {
      const filepath = path.join(HOOKS_DIR, "useValidationTiming.ts");
      const content = readFileContent(filepath);
      const requiredPatterns = [
        "handleChange",
        "handleBlur",
        "showError: false", // No errors while typing
        "validateAll",
        "pristine",
        "typing",
        "valid",
        "invalid",
      ];
      const missing: string[] = [];

      for (const pattern of requiredPatterns) {
        if (!content.includes(pattern)) {
          missing.push(pattern);
        }
      }

      return {
        passed: missing.length === 0,
        message: missing.length === 0
          ? "Validation timing pattern fully implemented"
          : `Missing validation patterns: ${missing.join(", ")}`,
        details: missing,
      };
    },
  },

  // Index file existence
  {
    name: "Index Exports",
    description: "Work Surface components have index.ts for clean imports",
    check: () => {
      const indexPath = path.join(COMPONENTS_DIR, "index.ts");
      const exists = fileExists(indexPath);
      const content = exists ? readFileContent(indexPath) : "";
      const hasExports = content.includes("export");

      return {
        passed: exists && hasExports,
        message: exists && hasExports
          ? "Index file exists with exports"
          : "Missing or empty index.ts",
      };
    },
  },

  // Documentation comments
  {
    name: "Documentation Complete",
    description: "All hooks have JSDoc documentation",
    check: () => {
      const issues: string[] = [];
      for (const spec of HOOK_SPECS) {
        const filepath = path.join(HOOKS_DIR, spec.filename);
        const content = readFileContent(filepath);
        if (!content.includes("/**") || !content.includes("@see")) {
          issues.push(`${spec.filename}: missing JSDoc documentation`);
        }
      }
      return {
        passed: issues.length === 0,
        message: issues.length === 0
          ? "All hooks have documentation"
          : "Some hooks need documentation",
        details: issues,
      };
    },
  },
];

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function runValidation(): void {
  console.log("═".repeat(70));
  console.log("  WORK SURFACE HOOKS INTEGRATION VALIDATION - Gate 0");
  console.log("  UXS Sprint 0 Validation Script");
  console.log("═".repeat(70));
  console.log();

  let passed = 0;
  let failed = 0;
  const failures: { name: string; result: ValidationResult }[] = [];

  for (const check of validationChecks) {
    const result = check.check();

    if (result.passed) {
      console.log(`  ✅ ${check.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${check.name}`);
      console.log(`     └─ ${result.message}`);
      if (result.details && result.details.length > 0) {
        for (const detail of result.details) {
          console.log(`        • ${detail}`);
        }
      }
      failed++;
      failures.push({ name: check.name, result });
    }
  }

  console.log();
  console.log("─".repeat(70));
  console.log();

  const total = passed + failed;
  const percentage = Math.round((passed / total) * 100);

  if (failed === 0) {
    console.log("  🎉 GATE 0 VALIDATION PASSED");
    console.log(`  All ${total} checks passed (100%)`);
    console.log();
    console.log("  Work Surface foundation hooks are ready for Sprint 1.");
    console.log("  Proceed to UXS-201: Direct Intake Work Surface");
  } else {
    console.log("  ⚠️  GATE 0 VALIDATION FAILED");
    console.log(`  ${passed}/${total} checks passed (${percentage}%)`);
    console.log();
    console.log("  Fix the following issues before proceeding:");
    for (const { name, result } of failures) {
      console.log(`  • ${name}: ${result.message}`);
    }
  }

  console.log();
  console.log("═".repeat(70));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
runValidation();
