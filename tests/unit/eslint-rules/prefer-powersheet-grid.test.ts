/**
 * Unit test — terp/prefer-powersheet-grid (TER-1291).
 *
 * Covers:
 *   - Random feature file importing from 'ag-grid-react' → fires
 *   - Importing from 'ag-grid-community' → does NOT fire (rule is
 *     only about the `react` package)
 *   - Allow-listed paths → do NOT fire
 */

import { RuleTester } from "eslint";
import { describe, it } from "vitest";
// @ts-expect-error — plain JS rule module (no bundled types)
import rule from "../../../eslint-rules/rules/prefer-powersheet-grid.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
});

const FEATURE_FILE = "/repo/client/src/components/new-feature/Foo.tsx";

// Allow-list paths that should NOT report.
const ALLOW_LISTED = [
  "/repo/client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx",
  "/repo/client/src/components/ag-grid/AgGridReactCompat.tsx",
  "/repo/client/src/components/spreadsheet/ClientGrid.tsx",
  "/repo/client/src/components/spreadsheet/InventoryGrid.tsx",
  "/repo/client/src/components/spreadsheet/PickPackGrid.tsx",
  "/repo/client/src/components/work-surface/DirectIntakeWorkSurface.tsx",
];

ruleTester.run("terp/prefer-powersheet-grid", rule, {
  valid: [
    // Importing the community package is fine.
    {
      code: `import { AllCommunityModule } from "ag-grid-community";`,
      filename: FEATURE_FILE,
    },
    // Allow-listed files may import ag-grid-react.
    ...ALLOW_LISTED.map((filename) => ({
      code: `import { AgGridReact } from "ag-grid-react";`,
      filename,
    })),
  ],
  invalid: [
    // Default feature file importing ag-grid-react directly.
    {
      code: `import { AgGridReact } from "ag-grid-react";`,
      filename: FEATURE_FILE,
      errors: [{ messageId: "preferPowersheet" }],
    },
    // Namespace import still fires.
    {
      code: `import * as AgGrid from "ag-grid-react";`,
      filename: FEATURE_FILE,
      errors: [{ messageId: "preferPowersheet" }],
    },
    // Side-effect import still fires.
    {
      code: `import "ag-grid-react";`,
      filename: FEATURE_FILE,
      errors: [{ messageId: "preferPowersheet" }],
    },
  ],
});
