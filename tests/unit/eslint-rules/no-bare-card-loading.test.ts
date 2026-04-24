/**
 * Unit test — terp/no-bare-card-loading (TER-1289).
 *
 * Covers:
 *   - Card with bare <Loader2 /> as first child → fires
 *   - CardContent with bare <Skeleton /> as first child → fires
 *   - Button with <Loader2 /> (mutation-pending pattern) → does NOT fire
 *   - Card wrapped with <OperationalStateSurface> → does NOT fire
 *   - Card with meaningful content before Loader2 → does NOT fire
 */

import { RuleTester } from "eslint";
import { describe, it } from "vitest";
// @ts-expect-error — plain JS rule module (no bundled types)
import rule from "../../../eslint-rules/rules/no-bare-card-loading.js";

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

ruleTester.run("terp/no-bare-card-loading", rule, {
  valid: [
    // Loader2 inside Button (mutation pending pattern) — allowed.
    {
      code: `<Button disabled><Loader2 /> Saving…</Button>`,
    },
    // Card wrapped via OperationalStateSurface — allowed.
    {
      code: `<OperationalStateSurface loading={isLoading}><Card><div>ready</div></Card></OperationalStateSurface>`,
    },
    // Card with real content — allowed.
    {
      code: `<Card><h2>Title</h2><div>body</div></Card>`,
    },
    // Card whose first child is a different element — allowed.
    {
      code: `<Card><div><Loader2 /></div></Card>`,
    },
    // OperationalStateSurface alone — not a Card/CardContent, so ignored.
    {
      code: `<OperationalStateSurface><Loader2 /></OperationalStateSurface>`,
    },
  ],
  invalid: [
    // <Card><Loader2/> → fires.
    {
      code: `<Card><Loader2 /></Card>`,
      errors: [{ messageId: "bareLoading" }],
    },
    // <CardContent><Skeleton/> → fires.
    {
      code: `<CardContent><Skeleton className="h-4 w-full" /></CardContent>`,
      errors: [{ messageId: "bareLoading" }],
    },
    // Whitespace before Loader2 should still fire (first meaningful child).
    {
      code: `<Card>\n  <Loader2 />\n</Card>`,
      errors: [{ messageId: "bareLoading" }],
    },
  ],
});
