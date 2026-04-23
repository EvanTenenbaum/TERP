/**
 * TERP Glossary — Canonical Terminology (TER-1315)
 *
 * Part of Epic TER-1283 ("Manus" UX v2). Closes T-15 findings — non-canonical
 * terminology that surfaces inconsistently across the UI (docs/ux-review/
 * 02-Implementation_Strategy.md §4.12).
 *
 * This module is the single source of truth for user-facing domain terms.
 * Use `GLOSSARY` when rendering labels, empty/error copy, tooltips, page
 * titles, or any other JSX text where the canonical noun matters. Do NOT
 * introduce synonyms (see `FORBIDDEN_TERMS`).
 *
 * Enforcement:
 *
 *   1. ESLint rule `terp/no-restricted-glossary` flags forbidden terms in
 *      JSX text content. Configured in `eslint.config.strict.js`.
 *   2. Codemod `scripts/codemods/codemod-glossary.ts` replaces the obvious
 *      occurrences in bulk (JSX text only, not identifiers, imports, or
 *      types).
 *
 * Neither the rule nor the codemod fire inside this file — it intentionally
 * references all forbidden strings so the mapping can be maintained.
 */

/**
 * Canonical user-facing terms. Import these instead of hard-coding labels
 * in JSX. Keeping the values wide `string` (via `as const`) lets downstream
 * code branch on specific literals where helpful (e.g. aria-labels).
 */
export const GLOSSARY = {
  /** A commercial order placed by a client. Replaces "Sales Order". */
  ORDER: "Order",
  /** A wholesale buyer (party). Replaces "Customer" / "Buyer". */
  CLIENT: "Client",
  /** A sellable inventory unit. Replaces "Item" / "Inventory Line". */
  SKU: "SKU",
  /** A payable obligation to a supplier. Kept for clarity alongside Invoice. */
  BILL: "Bill",
  /** A party we purchase from (seller). */
  SUPPLIER: "Supplier",
  /** A receivable billed to a client. Replaces "Vendor Invoice". */
  INVOICE: "Invoice",
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
export type GlossaryTerm = (typeof GLOSSARY)[GlossaryKey];

/**
 * Forbidden terms and their canonical replacements. Lookups are exact,
 * case-sensitive. Order matters for the codemod — multi-word entries
 * ("Sales Order", "Vendor Invoice", "Inventory Line") must be replaced
 * BEFORE single-word synonyms to avoid partial rewrites.
 *
 * The ESLint rule consumes the full map; the codemod sorts keys by length
 * descending so longer phrases win.
 */
export const FORBIDDEN_TERMS: Record<string, string> = {
  // Multi-word phrases first (longer keys win in the codemod sort).
  "Sales Order": GLOSSARY.ORDER,
  "Vendor Invoice": GLOSSARY.INVOICE,
  "Inventory Line": GLOSSARY.SKU,
  // Single-word synonyms.
  Customer: GLOSSARY.CLIENT,
  Buyer: GLOSSARY.CLIENT,
  Item: GLOSSARY.SKU,
};

/**
 * Convenience list for the ESLint rule — the six forbidden strings in a
 * stable order. Exposed as a frozen readonly array so rule tests and the
 * codemod agree on the canonical set.
 */
export const FORBIDDEN_TERM_LIST: readonly string[] = Object.freeze(
  Object.keys(FORBIDDEN_TERMS),
);
