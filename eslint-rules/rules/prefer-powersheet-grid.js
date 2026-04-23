/**
 * TER-1291 — terp/prefer-powersheet-grid
 *
 * Flags direct imports from `ag-grid-react` outside the hard-coded allow-list.
 * New code should consume the PowerSheet primitive (`SpreadsheetPilotGrid`) or
 * the shared compat wrapper (`AgGridReactCompat`) rather than wiring AG Grid
 * React directly into feature surfaces.
 *
 * Allow-list (hard-coded):
 *   - client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx
 *     (inner PowerSheet implementation)
 *   - client/src/components/ag-grid/AgGridReactCompat.tsx
 *     (shared compat layer)
 *   - client/src/components/spreadsheet/ClientGrid.tsx         // sunset
 *   - client/src/components/spreadsheet/InventoryGrid.tsx      // sunset
 *   - client/src/components/spreadsheet/PickPackGrid.tsx       // sunset
 *   - client/src/components/work-surface/DirectIntakeWorkSurface.tsx // sunset
 *
 * Level: `warn` — flips to `error` once the sunset grids migrate off AG Grid.
 */

import path from "node:path";

const ALLOW_LIST_SUFFIXES = [
  // PowerSheet primitive + compat layer
  "client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx",
  "client/src/components/ag-grid/AgGridReactCompat.tsx",
  // Sprint-5 legacy — sunset
  "client/src/components/spreadsheet/ClientGrid.tsx",
  "client/src/components/spreadsheet/InventoryGrid.tsx",
  "client/src/components/spreadsheet/PickPackGrid.tsx",
  "client/src/components/work-surface/DirectIntakeWorkSurface.tsx",
];

function normalizeFilename(filename) {
  if (!filename) return "";
  return filename.split(path.sep).join("/");
}

function isAllowListed(filename) {
  const normalized = normalizeFilename(filename);
  return ALLOW_LIST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer SpreadsheetPilotGrid / AgGridReactCompat over direct `ag-grid-react` imports.",
    },
    schema: [],
    messages: {
      preferPowersheet:
        "Do not import from 'ag-grid-react' directly. Use <SpreadsheetPilotGrid /> (or AgGridReactCompat for the compat layer) instead.",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (isAllowListed(filename)) return {};

    return {
      ImportDeclaration(node) {
        if (node.source && node.source.value === "ag-grid-react") {
          context.report({ node, messageId: "preferPowersheet" });
        }
      },
    };
  },
};

export default rule;
