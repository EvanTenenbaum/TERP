#!/usr/bin/env python3
"""
closeout-guard.py — blocks false closeout during TERP remediation train runs.

Fires on Stop and SubagentStop. Reads last_assistant_message from the hook
payload. If the message contains issue-closing language without explicit
evidence, exits 2 (blocking) and prints a checklist to stderr.

Non-blocking exit codes: 0 (allow), 1 (hook error, allow).
Blocking exit code: 2 (Claude must re-respond with evidence).

REVERT: Remove the Stop and SubagentStop entries from
  .claude/settings.local.json
  (The project settings.json and global settings are not modified.)
"""
from __future__ import annotations

import json
import re
import sys

# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

# Strong signals that an issue is being marked done/closed.
# Deliberately tight — generic "done" in passing does not trigger.
CLOSEOUT = re.compile(
    r"(?:"
    r"mark(?:ed|ing)?\s+(?:as\s+)?(?:done|complete[d]?|resolved|fixed|closed)"
    r"|(?:issue|bug|ticket|item)\s+(?:is\s+)?(?:resolved|closed|fixed|complete[d]?)"
    r"|(?:resolv|fix|complet|clos)(?:ed|ing)\s+(?:the\s+)?(?:issue|bug|ticket|item)"
    r"|all\s+(?:issues?|bugs?|items?|fixes?)\s+(?:are\s+)?(?:fixed|resolved|done|addressed|complete[d]?)"
    r"|implementation\s+is\s+complete[d]?"
    r"|(?:linear|status)\s+.*(?:done|complete[d]?|resolved)"
    r"|(?:done|complete[d]?|resolved)\s+.*(?:linear|status)"
    r")",
    re.IGNORECASE,
)

# Positive evidence signals — at least one must be present to allow closeout.
# Grouped into 5 categories mirroring the required checklist.
EVIDENCE_CATEGORIES: list[tuple[str, re.Pattern[str]]] = [
    (
        "duplicate-resolution",
        re.compile(
            r"(?:dedup(?:licate)?|duplicate.resol|duplicate.check"
            r"|no.duplicate|not.a.duplicate|confirmed.unique)",
            re.IGNORECASE,
        ),
    ),
    (
        "wiring-proof",
        re.compile(
            r"(?:wir(?:ing|ed)[\s\-]proof|wir(?:ing|ed)[\s\-]confirm"
            r"|code.path|handler.confirm|route.confirm|endpoint.confirm"
            r"|traced.to|wired.to|connected.to.the)",
            re.IGNORECASE,
        ),
    ),
    (
        "functional-proof",
        re.compile(
            r"(?:functional[\s\-]proof|test[s]?\s+pass(?:ed|ing)?|unit\s+test"
            r"|vitest|playwright|assertion\s+pass|verified\s+(?:the\s+)?fix"
            r"|confirmed\s+(?:the\s+)?fix|reproduced\s+and\s+fix)",
            re.IGNORECASE,
        ),
    ),
    (
        "live-surface-proof",
        re.compile(
            r"(?:stag(?:ing|e)[\s\-]verif|verified\s+on\s+stag"
            r"|confirmed\s+on\s+stag|live[\s\-]surface|live[\s\-]proof"
            r"|live[\s\-]check|screenshot|on\s+staging|in\s+staging"
            r"|prod(?:uction)?\s+verif)",
            re.IGNORECASE,
        ),
    ),
    (
        "explicit-evidence-state",
        re.compile(
            r"(?:evidence\s+state|explicit\s+evidence|evidence[\s\-]confirmed"
            r"|proof[\s\-]of|evidence\s+:\s|evidence:\s|evidence\s+–"
            r"|evidence\s+attached|evidence\s+below|evidence\s+above)",
            re.IGNORECASE,
        ),
    ),
]

# Minimum number of evidence categories that must match to allow closeout.
# Set to 2: catches zero-evidence closes while allowing partial evidence chains
# where some categories genuinely don't apply (e.g. live-surface not required).
MIN_EVIDENCE_CATEGORIES = 2


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # unparseable → don't block

    msg: str = payload.get("last_assistant_message", "") or ""
    if not msg.strip():
        sys.exit(0)  # no message → don't block

    if not CLOSEOUT.search(msg):
        sys.exit(0)  # no closeout language → allow

    matched = [label for label, pat in EVIDENCE_CATEGORIES if pat.search(msg)]

    if len(matched) >= MIN_EVIDENCE_CATEGORIES:
        sys.exit(0)  # sufficient evidence → allow

    missing = [label for label, _ in EVIDENCE_CATEGORIES if label not in matched]

    print(
        "\n[CLOSEOUT GUARD] Stop blocked — completion claimed without sufficient evidence.\n"
        f"Evidence categories matched: {matched or 'none'}\n"
        f"Missing (at least {MIN_EVIDENCE_CATEGORIES - len(matched)} more required):\n"
        + "".join(f"  • {m}\n" for m in missing)
        + "\nBefore this issue can be closed, explicitly state for each applicable item:\n"
        "  1. duplicate-resolution  — confirmed no duplicate or resolved which is canonical\n"
        "  2. wiring-proof          — code path traced from trigger to fix\n"
        "  3. functional-proof      — test/assertion passing or manually verified fix\n"
        "  4. live-surface-proof    — staging screenshot / confirmed on staging (if required)\n"
        "  5. explicit-evidence-state — summary of evidence collected\n"
        "\nIf a category does not apply, state 'N/A — <reason>' for that item.",
        file=sys.stderr,
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
