/**
 * Unit test — terp/no-inline-text-right-on-coldef (TER-1290).
 *
 * Covers:
 *   - cellClass: "text-right font-mono" → fires
 *   - cellClass: "powersheet-cell--locked font-mono text-right" → fires
 *   - cellClass: "text-right" (no font-mono) → does NOT fire
 *   - cellClass: params => ... (function) → does NOT fire (not a static string)
 *   - SpreadsheetPilotGrid.tsx allow-list → does NOT fire
 *   - Out-of-scope path (server/**) → does NOT fire
 */

import { RuleTester } from "eslint";
import { describe, it } from "vitest";
// @ts-expect-error — plain JS rule module (no bundled types)
import rule from "../../../eslint-rules/rules/no-inline-text-right-on-coldef.js";

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

const IN_SCOPE = "/repo/client/src/components/feature/Foo.tsx";
const ALLOWED = "/repo/client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx";
const OUT_OF_SCOPE = "/repo/server/routers/foo.ts";

ruleTester.run("terp/no-inline-text-right-on-coldef", rule, {
  valid: [
    // Only text-right (no font-mono) — allowed.
    {
      code: `const col = { cellClass: "text-right" };`,
      filename: IN_SCOPE,
    },
    // Only font-mono — allowed.
    {
      code: `const col = { cellClass: "font-mono" };`,
      filename: IN_SCOPE,
    },
    // Function cellClass — not a static string, skip.
    {
      code: `const col = { cellClass: (params) => "text-right font-mono" };`,
      filename: IN_SCOPE,
    },
    // Allow-list: SpreadsheetPilotGrid itself.
    {
      code: `const col = { cellClass: "text-right font-mono" };`,
      filename: ALLOWED,
    },
    // Out-of-scope: not under client/src.
    {
      code: `const col = { cellClass: "text-right font-mono" };`,
      filename: OUT_OF_SCOPE,
    },
    // PowerSheet alignment class — allowed.
    {
      code: `const col = { cellClass: "powersheet-cell--numeric" };`,
      filename: IN_SCOPE,
    },
  ],
  invalid: [
    // Minimal: both tokens in a literal string.
    {
      code: `const col = { cellClass: "text-right font-mono" };`,
      filename: IN_SCOPE,
      errors: [{ messageId: "inlineAlignment" }],
    },
    // Real-world ordering with an extra class in between.
    {
      code: `const col = { cellClass: "powersheet-cell--locked font-mono text-right" };`,
      filename: IN_SCOPE,
      errors: [{ messageId: "inlineAlignment" }],
    },
    // Template literal with no interpolation.
    {
      code: "const col = { cellClass: `text-right font-mono` };",
      filename: IN_SCOPE,
      errors: [{ messageId: "inlineAlignment" }],
    },
  ],
});
