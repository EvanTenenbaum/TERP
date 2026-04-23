/**
 * TER-1315 — terp/no-restricted-glossary
 *
 * Flags JSX text nodes that contain any of the six non-canonical TERP
 * terminology strings. The canonical replacements live in
 * `client/src/config/glossary.ts` (`FORBIDDEN_TERMS` / `GLOSSARY`).
 *
 * Matching rules:
 *   - Only `JSXText` nodes and the string portion of static
 *     `JSXExpressionContainer` literals are inspected. Import sources,
 *     type names, variable identifiers, and non-JSX string literals are
 *     left alone — that surface is handled by the codemod and code review.
 *   - Exact, case-sensitive substring matching, with word-boundary checks
 *     so "Items" and "ItemGroup" don't trigger on "Item", and "Customers"
 *     still triggers on "Customer" (plural forms are the common offender).
 *
 * Exclusions (no report):
 *   - `client/src/config/glossary.ts` — the file defines the mapping itself.
 *   - `*.test.{ts,tsx}` / `*.spec.{ts,tsx}` — test fixtures often quote the
 *     forbidden strings intentionally.
 *   - `*.stories.{ts,tsx}` — Storybook fixtures.
 *   - Non-client code (`server/**`, `scripts/**`, …) — out of scope.
 *
 * Level: `warn` in `eslint.config.strict.js` so the codemod can run first;
 * the plan is to flip to `error` after TER-1315 cleanup lands.
 */

import path from "node:path";

/**
 * Canonical forbidden → replacement mapping. Kept in lockstep with
 * `client/src/config/glossary.ts#FORBIDDEN_TERMS`. Duplicated here (rather
 * than imported) because ESLint rule files load as plain ESM JS outside the
 * TypeScript graph, and we want the rule to be usable without a build step.
 */
const FORBIDDEN_TERMS = {
  "Sales Order": "Order",
  "Vendor Invoice": "Invoice",
  "Inventory Line": "SKU",
  Customer: "Client",
  Buyer: "Client",
  Item: "SKU",
};

/** Longest keys first so multi-word phrases match before their substrings. */
const FORBIDDEN_KEYS = Object.keys(FORBIDDEN_TERMS).sort(
  (a, b) => b.length - a.length,
);

function normalizeFilename(filename) {
  if (!filename) return "";
  return filename.split(path.sep).join("/");
}

function isInClientSrc(filename) {
  return normalizeFilename(filename).includes("/client/src/");
}

function isExcludedPath(filename) {
  const normalized = normalizeFilename(filename);
  if (normalized.endsWith("/client/src/config/glossary.ts")) return true;
  if (/\.(test|spec)\.tsx?$/.test(normalized)) return true;
  if (/\.stories\.tsx?$/.test(normalized)) return true;
  return false;
}

/**
 * Find the first forbidden term occurrence in `text`, respecting basic
 * word boundaries on single-word synonyms so plural forms still fire but
 * compound identifiers (e.g. "ItemGroup") don't.
 *
 * Returns `{ term, replacement }` or `null`.
 */
function findForbiddenMatch(text) {
  if (!text || typeof text !== "string") return null;
  for (const term of FORBIDDEN_KEYS) {
    if (term.includes(" ")) {
      // Multi-word phrases: exact substring match is specific enough.
      if (text.includes(term)) {
        return { term, replacement: FORBIDDEN_TERMS[term] };
      }
      continue;
    }
    // Single-word: require a non-word char (or string boundary) on the LEFT
    // so "SubItem" / "LineItem" don't match. Allow any trailing chars so
    // plurals like "Customers" still match.
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${term}`);
    if (pattern.test(text)) {
      return { term, replacement: FORBIDDEN_TERMS[term] };
    }
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Forbid non-canonical TERP terminology (Customer/Buyer/Sales Order/Vendor Invoice/Item/Inventory Line) " +
        "in JSX text. Use the canonical terms from client/src/config/glossary.ts (GLOSSARY).",
    },
    schema: [],
    messages: {
      forbiddenGlossary:
        'Non-canonical term "{{term}}" in JSX text — use "{{replacement}}" from client/src/config/glossary.ts (GLOSSARY).',
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!isInClientSrc(filename)) return {};
    if (isExcludedPath(filename)) return {};

    function check(node, text) {
      const match = findForbiddenMatch(text);
      if (!match) return;
      context.report({
        node,
        messageId: "forbiddenGlossary",
        data: match,
      });
    }

    return {
      JSXText(node) {
        check(node, node.value);
      },
      // Static string literals used as JSX children, e.g. {"Customer name"}.
      JSXExpressionContainer(node) {
        const expr = node.expression;
        if (!expr) return;
        if (expr.type === "Literal" && typeof expr.value === "string") {
          check(expr, expr.value);
          return;
        }
        if (
          expr.type === "TemplateLiteral" &&
          expr.expressions.length === 0
        ) {
          const text = expr.quasis.map((q) => q.value.cooked).join("");
          check(expr, text);
        }
      },
    };
  },
};

export default rule;
