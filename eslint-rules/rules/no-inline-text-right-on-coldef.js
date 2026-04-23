/**
 * TER-1290 — terp/no-inline-text-right-on-coldef
 *
 * Flags ColDef object literals that pin alignment inline via `cellClass`
 * containing BOTH the `text-right` AND `font-mono` tokens. Numeric-cell
 * alignment should be expressed through the shared PowerSheet primitives
 * (e.g. `powersheet-cell--numeric`) instead of ad-hoc Tailwind strings.
 *
 * Scope: `client/src/**` only.
 * Allow-list: `client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx`
 * (the primitive itself is allowed to define the alignment contract).
 *
 * Level: `error` — the codemod runs before this rule lands in the strict
 * config, so the tree stays clean.
 */

import path from "node:path";

const ALLOW_LIST_SUFFIXES = [
  "client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx",
];

function normalizeFilename(filename) {
  if (!filename) return "";
  return filename.split(path.sep).join("/");
}

function isAllowListed(filename) {
  const normalized = normalizeFilename(filename);
  return ALLOW_LIST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function isInClientSrc(filename) {
  return normalizeFilename(filename).includes("/client/src/");
}

function extractStaticString(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked).join("");
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid inline `text-right font-mono` on ColDef.cellClass. Use a PowerSheet alignment class instead.",
    },
    schema: [],
    messages: {
      inlineAlignment:
        'Inline `text-right font-mono` on ColDef.cellClass is forbidden. ' +
        'Use a PowerSheet alignment class (e.g. "powersheet-cell--numeric") instead.',
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!isInClientSrc(filename)) return {};
    if (isAllowListed(filename)) return {};

    return {
      Property(node) {
        if (!node.key) return;
        const keyName =
          node.key.type === "Identifier"
            ? node.key.name
            : node.key.type === "Literal"
              ? node.key.value
              : null;
        if (keyName !== "cellClass") return;

        const staticValue = extractStaticString(node.value);
        if (staticValue === null) return;

        // Tokenize on whitespace so "font-mono-extra" doesn't match "font-mono".
        const tokens = new Set(staticValue.split(/\s+/).filter(Boolean));
        if (tokens.has("text-right") && tokens.has("font-mono")) {
          context.report({ node, messageId: "inlineAlignment" });
        }
      },
    };
  },
};

export default rule;
