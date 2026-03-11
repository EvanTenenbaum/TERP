#!/usr/bin/env python3
"""Generate the March 10 recording backlog Wave 0 packet."""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path


ROOT = Path("/Users/evan/spec-erp-docker/TERP/TERP-recording-backlog")
ARTIFACT_ROOT = Path("/Users/evan/spec-erp-docker/TERP/artifacts")
TIMELINE_PATH = (
    ARTIFACT_ROOT
    / "video-feedback/2026-03-10-staging-feedback/04_timeline/comment_timeline.json"
)
OUTPUT_DIR = ROOT / "docs/execution/2026-03-11-recording-backlog-closure"
LEDGER_CSV = OUTPUT_DIR / "01-coverage-ledger.csv"
LEDGER_JSON = OUTPUT_DIR / "01-coverage-ledger.json"
CROSSWALK_MD = OUTPUT_DIR / "02-finding-crosswalk.md"

HANDOFF_REPORT = Path(
    "/Users/evan/spec-erp-docker/TERP/artifacts/reports/2026-03-11-codex-execution-manager-handoff.md"
)
ACTIONABLE_REPORT = Path(
    "/Users/evan/spec-erp-docker/TERP/artifacts/reports/2026-03-10-staging-video-feedback-actionable-report.md"
)
BLUEPRINT_REPORT = Path(
    "/Users/evan/spec-erp-docker/TERP/artifacts/reports/2026-03-10-staging-system-remediation-blueprint.md"
)
ADVERSARIAL_REPORT = Path(
    "/Users/evan/spec-erp-docker/TERP/TERP-low-rebuild-20260310-04c982f7/artifacts/reports/2026-03-11-adversarial-v4-qa-vs-screen-recording.md"
)


VALID_STATES = {
    "open",
    "partial",
    "closed with evidence",
    "rejected with evidence",
}

ISSUE_TITLES = {
    "TER-690": "Coverage ledger and baseline carry-forward",
    "TER-694": "Quote edit / duplicate / convert proof",
    "TER-695": "Returns from transaction context",
    "TER-696": "Pricing profile propagation",
    "TER-697": "Margin and FIFO clarity",
    "TER-698": "Sales UI cleanup",
    "TER-699": "Shipping vocabulary simplification",
    "TER-700": "Shipping truthfulness and stale filters",
    "TER-701": "Shipping operator proof",
    "TER-702": "Operations chrome compression",
    "TER-703": "Inventory first-class workspace",
    "TER-704": "Simplified samples model",
    "TER-705": "Samples browser proof",
    "TER-706": "Photography queue redesign",
    "TER-707": "Photography camera/upload fallback",
    "TER-708": "Accounting quick-action landing",
    "TER-709": "Credit capacity vs adjustments semantics",
    "TER-710": "Finance hierarchy and dashboard-first credits",
    "TER-711": "Relationships terminology cleanup",
    "TER-712": "Lightweight relationships create/edit flow",
    "TER-713": "Final replay from the ledger",
    "TER-714": "Final closure report",
}

ISSUE_URLS = {
    issue: f"https://linear.app/terpcorp/issue/{issue.lower()}/{title.lower().replace(' ', '-').replace('/', '-')}"
    for issue, title in ISSUE_TITLES.items()
}

PROOF_REQUIREMENTS = {
    "TER-690": "report cross-check",
    "TER-694": "browser replay plus code trace",
    "TER-695": "role-aware browser replay plus logic proof",
    "TER-696": "pricing logic tests plus browser replay",
    "TER-697": "pricing logic proof plus browser replay",
    "TER-698": "browser replay",
    "TER-699": "status mapping artifact plus browser replay",
    "TER-700": "browser replay",
    "TER-701": "role-aware browser replay",
    "TER-702": "browser replay",
    "TER-703": "browser replay plus route/IA proof",
    "TER-704": "state-model mapping plus test proof",
    "TER-705": "browser replay",
    "TER-706": "browser replay",
    "TER-707": "browser replay under denied camera plus upload fallback",
    "TER-708": "browser before/after on staging",
    "TER-709": "browser replay plus terminology proof",
    "TER-710": "browser replay",
    "TER-711": "browser label audit",
    "TER-712": "browser create/edit replay",
    "TER-713": "full staging replay",
    "TER-714": "final evidence report",
}

NON_ACTIONABLE_PHRASES = {
    "okay.",
    "got it. so this is",
    "but",
    "uh,",
    "um",
    "right?",
    "okay, yeah.",
    "let's see here.",
    "let's yeah,",
    "all that.",
}

MANUAL_OWNER_OVERRIDES = {
    2: "TER-690",
    3: "TER-690",
    4: "TER-690",
    5: "TER-690",
    6: "TER-690",
    7: "TER-690",
    8: "TER-690",
    9: "TER-690",
    12: "TER-690",
    13: "TER-690",
    14: "TER-698",
    19: "TER-698",
    23: "TER-698",
    26: "TER-698",
    30: "TER-698",
    35: "TER-690",
    36: "TER-698",
    39: "TER-694",
    40: "TER-694",
    41: "TER-694",
    43: "TER-698",
    44: "TER-698",
    45: "TER-698",
    46: "TER-698",
    47: "TER-698",
    48: "TER-694",
    52: "TER-708",
    53: "TER-696",
    55: "TER-696",
    56: "TER-698",
    57: "TER-698",
    60: "TER-695",
    61: "TER-695",
    62: "TER-695",
    63: "TER-695",
    64: "TER-695",
    65: "TER-695",
    70: "TER-698",
    71: "TER-698",
    73: "TER-712",
    74: "TER-712",
    75: "TER-712",
    76: "TER-712",
    77: "TER-712",
    78: "TER-712",
    79: "TER-712",
    80: "TER-712",
    81: "TER-698",
    82: "TER-698",
    83: "TER-698",
    84: "TER-698",
    85: "TER-698",
    86: "TER-698",
    87: "TER-698",
    88: "TER-698",
    89: "TER-698",
    90: "TER-698",
    91: "TER-698",
    92: "TER-698",
    118: "TER-697",
    121: "TER-690",
    122: "TER-690",
    123: "TER-690",
    125: "TER-712",
    130: "TER-712",
    133: "TER-712",
    136: "TER-711",
    137: "TER-711",
    139: "TER-711",
    140: "TER-711",
    141: "TER-712",
    142: "TER-712",
    143: "TER-712",
    144: "TER-712",
    145: "TER-711",
    146: "TER-711",
    148: "TER-712",
    151: "TER-712",
    152: "TER-712",
    153: "TER-712",
    155: "TER-702",
    156: "TER-702",
    157: "TER-702",
    158: "TER-702",
    159: "TER-702",
    160: "TER-702",
    161: "TER-702",
    162: "TER-702",
    163: "TER-702",
    164: "TER-702",
    166: "TER-703",
    167: "TER-703",
    168: "TER-703",
    169: "TER-702",
    173: "TER-699",
    175: "TER-690",
    176: "TER-690",
    177: "TER-690",
    178: "TER-690",
    179: "TER-690",
    182: "TER-700",
    183: "TER-701",
    184: "TER-699",
    187: "TER-699",
    188: "TER-701",
    189: "TER-701",
    190: "TER-701",
    191: "TER-701",
    192: "TER-699",
    193: "TER-699",
    194: "TER-699",
    195: "TER-707",
    196: "TER-704",
    197: "TER-704",
    198: "TER-704",
    200: "TER-704",
    201: "TER-704",
    202: "TER-704",
    203: "TER-706",
    204: "TER-706",
    205: "TER-706",
    206: "TER-706",
    207: "TER-706",
    208: "TER-706",
    209: "TER-706",
    210: "TER-706",
    211: "TER-706",
    212: "TER-706",
    213: "TER-706",
    214: "TER-706",
    215: "TER-706",
    216: "TER-706",
    217: "TER-708",
    218: "TER-708",
    221: "TER-708",
    225: "TER-710",
    227: "TER-710",
    228: "TER-708",
    230: "TER-710",
    231: "TER-709",
    232: "TER-709",
    233: "TER-709",
    234: "TER-709",
    239: "TER-710",
}

STATUS_OVERRIDES = {
    1: ("rejected with evidence", "Non-actionable transcript filler."),
    2: ("closed with evidence", "Dashboard/home return path carried forward in the low-rebuild slice."),
    3: ("rejected with evidence", "Introductory narration; no independent product change request."),
    4: ("closed with evidence", "Buy-side navigation moved out of buried Operations path in the low-rebuild slice."),
    5: ("closed with evidence", "Buy-side navigation moved out of buried Operations path in the low-rebuild slice."),
    6: ("closed with evidence", "Canonical top-level IA carried forward in the low-rebuild slice."),
    7: ("closed with evidence", "Canonical top-level IA carried forward in the low-rebuild slice."),
    8: ("closed with evidence", "Owner command center default behavior already exists and is browser-proven in the low-rebuild slice."),
    9: ("closed with evidence", "Owner command center default behavior already exists and is browser-proven in the low-rebuild slice."),
    10: ("rejected with evidence", "Navigation instruction only, not an independent finding."),
    11: ("rejected with evidence", "Acknowledgement only."),
    12: ("closed with evidence", "Core stale filter persistence was removed on touched surfaces in the low-rebuild slice."),
    13: ("closed with evidence", "Core stale filter persistence was removed on touched surfaces in the low-rebuild slice."),
    14: ("open", "Status sorting is still not explicitly proven or closed in the active backlog."),
    15: ("rejected with evidence", "Navigation filler."),
    16: ("rejected with evidence", "Navigation filler."),
    17: ("rejected with evidence", "Navigation filler."),
    18: ("rejected with evidence", "Orientation narration, not an independent defect."),
    19: ("open", "Sales action hierarchy still needs explicit closure proof."),
    20: ("rejected with evidence", "Agreement filler."),
    21: ("open", "Sales action hierarchy still needs explicit closure proof."),
    22: ("rejected with evidence", "Lead-in filler."),
    23: ("open", "Sales action hierarchy still needs explicit closure proof."),
    24: ("rejected with evidence", "Supporting emphasis only."),
    25: ("rejected with evidence", "Navigation lead-in only."),
    26: ("open", "Order editability is not fully closed in the active backlog."),
    27: ("rejected with evidence", "Supporting phrase only."),
    28: ("rejected with evidence", "Supporting phrase only."),
    29: ("rejected with evidence", "Acknowledgement only."),
    30: ("open", "Order editability is not fully closed in the active backlog."),
    35: ("closed with evidence", "Invoice gating was corrected and browser-proven in the low-rebuild slice."),
    39: ("partial", "Quote edit affordances exist, but seeded browser proof is still missing."),
    40: ("partial", "Quote edit affordances exist, but seeded browser proof is still missing."),
    41: ("partial", "Quote edit affordances exist, but seeded browser proof is still missing."),
    42: ("partial", "Quote interaction affordances exist, but seeded browser proof is still missing."),
    43: ("open", "Sales status language still needs cleanup."),
    44: ("open", "Sales status language still needs cleanup."),
    45: ("partial", "Retired workflow chrome is reduced but not fully eliminated from live sales flows."),
    46: ("partial", "Retired workflow chrome is reduced but not fully eliminated from live sales flows."),
    47: ("partial", "Retired workflow chrome is reduced but not fully eliminated from live sales flows."),
    48: ("partial", "Duplicate affordance exists but is not yet browser-proven with seeded data."),
    52: ("open", "Accounting quick-action priority is still open in the finance lane."),
    53: ("open", "Pricing profile propagation remains materially open."),
    55: ("open", "Pricing configuration and operator explanation remain materially open."),
    56: ("open", "Sales workspace density and blank-space cleanup remain open."),
    57: ("open", "Sales workspace density and blank-space cleanup remain open."),
    60: ("partial", "Returns logic exists, but true transaction-context replay under the right role is still missing."),
    61: ("partial", "Returns logic exists, but true transaction-context replay under the right role is still missing."),
    62: ("partial", "Returns logic exists, but true transaction-context replay under the right role is still missing."),
    63: ("partial", "Returns logic exists, but true transaction-context replay under the right role is still missing."),
    64: ("partial", "Returns logic exists, but true transaction-context replay under the right role is still missing."),
    65: ("partial", "Returns logic exists, but true transaction-context replay under the right role is still missing."),
    70: ("partial", "Blank quote-panel failure is improved, but full live flow replay is still needed."),
    71: ("partial", "Blank quote-panel failure is improved, but full live flow replay is still needed."),
    73: ("open", "Referral attribution vs compensation home still needs explicit closure mapping."),
    74: ("open", "Referral attribution vs compensation home still needs explicit closure mapping."),
    75: ("open", "Referral attribution vs compensation home still needs explicit closure mapping."),
    76: ("open", "Referral attribution vs compensation home still needs explicit closure mapping."),
    77: ("rejected with evidence", "Comment narrows scope but does not define a separate defect."),
    78: ("open", "Referral settings ownership still needs explicit closure mapping."),
    79: ("open", "Referral settings ownership still needs explicit closure mapping."),
    80: ("open", "Referral settings ownership still needs explicit closure mapping."),
    118: ("open", "Margin and FIFO explainability remains materially open."),
    121: ("closed with evidence", "Relationships is already promoted to top-level nav in the low-rebuild slice."),
    122: ("closed with evidence", "Relationships is already promoted to top-level nav in the low-rebuild slice."),
    123: ("closed with evidence", "Stale relationship search persistence was removed in the low-rebuild slice."),
    130: ("open", "Main relationships entrypoint still uses the heavy wizard."),
    133: ("open", "Main relationships entrypoint still uses the heavy wizard."),
    136: ("open", "Terminology cleanup is not yet complete."),
    137: ("open", "Terminology cleanup is not yet complete."),
    139: ("open", "Terminology cleanup is not yet complete."),
    140: ("open", "Terminology cleanup is not yet complete."),
    141: ("open", "Lightweight first-pass field set is not yet complete."),
    144: ("open", "Lightweight first-pass field set is not yet complete."),
    145: ("open", "Username/email terminology cleanup is not yet complete."),
    146: ("open", "Username/email terminology cleanup is not yet complete."),
    152: ("open", "Relationship save-state visibility is not yet complete."),
    153: ("open", "Relationship save-history visibility is not yet complete."),
    166: ("open", "Inventory is still nested inside Operations rather than being a first-class workspace."),
    167: ("open", "Inventory is still nested inside Operations rather than being a first-class workspace."),
    168: ("open", "Inventory is still nested inside Operations rather than being a first-class workspace."),
    175: ("partial", "PO-driven receiving handoff exists and is browser-proven, but the full receiving lifecycle is not yet closed."),
    176: ("partial", "PO-driven receiving handoff exists and is browser-proven, but the full receiving lifecycle is not yet closed."),
    177: ("partial", "PO-driven receiving handoff exists and is browser-proven, but editable variance handling is not yet fully closed."),
    178: ("partial", "PO-driven receiving handoff exists and is browser-proven, but editable variance handling is not yet fully closed."),
    179: ("partial", "PO-driven receiving handoff exists and is browser-proven, but editable variance handling is not yet fully closed."),
    182: ("open", "Shipping false-empty/stale-state behavior is still open."),
    183: ("partial", "Shipping actions exist, but role-aware end-to-end proof is still missing."),
    184: ("open", "Shipping vocabulary still shows invalid operator-facing language."),
    187: ("open", "Shipping lifecycle terminology still needs simplification."),
    188: ("partial", "Shipping actions exist, but role-aware end-to-end proof is still missing."),
    189: ("partial", "Shipping actions exist, but role-aware end-to-end proof is still missing."),
    190: ("partial", "Shipping actions exist, but role-aware end-to-end proof is still missing."),
    191: ("partial", "Shipping actions exist, but role-aware end-to-end proof is still missing."),
    192: ("open", "Shipping vocabulary simplification remains open."),
    193: ("open", "Shipping vocabulary simplification remains open."),
    194: ("open", "Shipping vocabulary simplification remains open."),
    195: ("open", "Camera/upload fallback remains open."),
    196: ("open", "Simplified samples model remains open."),
    197: ("open", "Simplified samples model remains open."),
    198: ("open", "Simplified samples model remains open."),
    200: ("open", "Simplified samples model remains open."),
    201: ("open", "Simplified samples model remains open."),
    202: ("open", "Simplified samples model remains open."),
    203: ("open", "Photography queue simplification remains open."),
    204: ("open", "Photography queue simplification remains open."),
    205: ("open", "Photography queue simplification remains open."),
    206: ("open", "Photography queue simplification remains open."),
    207: ("open", "Photography queue simplification remains open."),
    208: ("open", "Photography queue simplification remains open."),
    209: ("open", "Photography queue simplification remains open."),
    210: ("open", "Photography queue simplification remains open."),
    211: ("open", "Photography queue simplification remains open."),
    212: ("rejected with evidence", "Clarifying phrase only."),
    213: ("open", "Photography queue simplification remains open."),
    214: ("partial", "Ownership audit requirement captured; design may already be partly built or unwired."),
    215: ("partial", "Ownership audit requirement captured; design may already be partly built or unwired."),
    216: ("partial", "Ownership audit requirement captured; design may already be partly built or unwired."),
    217: ("open", "Accounting landing quick-action restructure remains open."),
    218: ("open", "Accounting landing quick-action restructure remains open."),
    219: ("open", "Finance hierarchy cleanup remains open."),
    220: ("rejected with evidence", "Acknowledgement that some finance controls may stay; not a standalone defect."),
    221: ("open", "Accounting landing quick-action restructure remains open."),
    222: ("rejected with evidence", "Filler only."),
    223: ("open", "Finance hierarchy cleanup remains open."),
    224: ("open", "Finance hierarchy cleanup remains open."),
    225: ("open", "Finance hierarchy cleanup remains open."),
    226: ("open", "Finance terminology cleanup remains open."),
    227: ("open", "Finance terminology cleanup remains open."),
    228: ("open", "Finance transaction-correction path remains open."),
    229: ("open", "Finance hierarchy cleanup remains open."),
    230: ("open", "Finance hierarchy cleanup remains open."),
    231: ("open", "Credit semantics cleanup remains open."),
    232: ("open", "Credit semantics cleanup remains open."),
    233: ("open", "Credit semantics cleanup remains open."),
    234: ("open", "Credit semantics cleanup remains open."),
    239: ("open", "Finance information architecture cleanup remains open."),
}


@dataclass(frozen=True)
class VisualFinding:
    finding_id: str
    timestamp: str
    title: str
    problem_statement: str
    owner_issue: str
    state: str
    notes: str


VISUAL_FINDINGS = [
    VisualFinding(
        "V-SF-01",
        "08:02-08:08",
        "Sales blank main panel",
        "The Sales workspace renders a near-empty main panel while tabs remain visible.",
        "TER-698",
        "partial",
        "Explicit empty-state handling exists, but live populated-flow replay is still required.",
    ),
    VisualFinding(
        "V-SF-02",
        "16:36",
        "Relationships stale search token",
        "Relationships opens with a stale search token and a false empty state.",
        "TER-690",
        "closed with evidence",
        "Core stale filter persistence was removed on touched surfaces in the low-rebuild slice.",
    ),
    VisualFinding(
        "V-SF-03",
        "23:26",
        "Inventory raw query failure",
        "Inventory exposes raw query failure details in the operator UI.",
        "TER-702",
        "partial",
        "Operator-facing raw payload leakage was reduced, but a fresh live replay is still required.",
    ),
    VisualFinding(
        "V-SF-04",
        "25:12",
        "Shipping false empty state",
        "Shipping shows counts but the list is effectively empty because stale query state survives.",
        "TER-700",
        "open",
        "Explorer audit still found persisted shipping filters without reset behavior.",
    ),
    VisualFinding(
        "V-SF-05",
        "26:43",
        "Photography camera failure toast",
        "Photography upload flow falls back to a camera error toast without a clear recovery path.",
        "TER-707",
        "open",
        "Camera failure toast exists, but recovery UX and replay proof are still missing.",
    ),
]


def comment_issue(comment_id: int, text: str) -> str:
    if comment_id in MANUAL_OWNER_OVERRIDES:
        return MANUAL_OWNER_OVERRIDES[comment_id]

    lower = text.lower()

    def has_term(*terms: str) -> bool:
        return any(re.search(rf"\b{re.escape(term)}\b", lower) for term in terms)

    if 121 <= comment_id <= 153:
        return "TER-712"
    if 217 <= comment_id <= 239:
        if has_term("credit", "credits", "client credits", "purchasing power"):
            return "TER-709"
        if has_term("accounting", "quick actions", "quick action"):
            return "TER-708"
        return "TER-710"
    if 166 <= comment_id <= 195:
        if has_term("shipping", "packed", "shipped", "ready", "pending", "partial"):
            return "TER-699"
        if has_term("pack", "manifest"):
            return "TER-701"
        return "TER-703"
    if 196 <= comment_id <= 202:
        return "TER-704"
    if 203 <= comment_id <= 216:
        return "TER-706"
    if 81 <= comment_id <= 92:
        return "TER-698"
    if 155 <= comment_id <= 164:
        return "TER-702"
    if has_term("quote", "duplicate", "workflow") or "sales order" in lower:
        return "TER-698"
    if has_term("return", "transaction view"):
        return "TER-695"
    if "pricing profile" in lower or has_term("pricing", "category", "subcategory", "cogs"):
        return "TER-696"
    if has_term("margin", "fifo", "price"):
        return "TER-697"
    if has_term("relationship", "client", "wizard", "username", "code name"):
        return "TER-712"
    if has_term("shipping", "pack", "ready", "shipped"):
        return "TER-699"
    if has_term("inventory", "filter") or "advanced filter" in lower:
        return "TER-702"
    if has_term("sample", "samples"):
        return "TER-704"
    if has_term("photo", "camera", "upload", "spreadsheet"):
        return "TER-706"
    if has_term("accounting", "credit", "credits", "ledger"):
        return "TER-708"
    return "TER-690"


def default_state(comment_id: int, text: str, owner_issue: str) -> tuple[str, str]:
    if comment_id in STATUS_OVERRIDES:
        return STATUS_OVERRIDES[comment_id]

    lower = text.strip().lower()
    if lower in NON_ACTIONABLE_PHRASES or len(lower) <= 12:
        return ("rejected with evidence", "Transcript filler or acknowledgment without a separate product request.")
    if owner_issue == "TER-690":
        return ("rejected with evidence", "Context-setting or already-carried-forward note pending explicit replay reuse.")
    return ("open", "No current evidence packet has yet closed this row.")


def title_for(text: str) -> str:
    compact = " ".join(text.split())
    if not compact:
        return "No transcript text"
    if len(compact) <= 72:
        return compact
    return compact[:69] + "..."


def load_comments() -> list[dict[str, str]]:
    data = json.loads(TIMELINE_PATH.read_text())
    return data["comments"]


def build_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for comment in load_comments():
        comment_id = int(comment["id"][1:])
        owner_issue = comment_issue(comment_id, comment["verbatim_comment"])
        state, notes = default_state(comment_id, comment["verbatim_comment"], owner_issue)
        assert state in VALID_STATES
        rows.append(
            {
                "finding_id": comment["id"],
                "finding_kind": "narrated",
                "timestamp": comment["start_timestamp"],
                "short_title": title_for(comment["verbatim_comment"]),
                "problem_statement": comment["verbatim_comment"].strip(),
                "state": state,
                "owner_issue": owner_issue,
                "owner_issue_title": ISSUE_TITLES[owner_issue],
                "proof_requirement": PROOF_REQUIREMENTS[owner_issue],
                "source_artifact": str(TIMELINE_PATH),
                "source_evidence_ref": f"comment_timeline::{comment['id']}",
                "notes": notes,
                "evidence_links": "",
            }
        )

    for finding in VISUAL_FINDINGS:
        rows.append(
            {
                "finding_id": finding.finding_id,
                "finding_kind": "visual-only",
                "timestamp": finding.timestamp,
                "short_title": finding.title,
                "problem_statement": finding.problem_statement,
                "state": finding.state,
                "owner_issue": finding.owner_issue,
                "owner_issue_title": ISSUE_TITLES[finding.owner_issue],
                "proof_requirement": PROOF_REQUIREMENTS[finding.owner_issue],
                "source_artifact": str(ACTIONABLE_REPORT),
                "source_evidence_ref": finding.finding_id,
                "notes": finding.notes,
                "evidence_links": "",
            }
        )

    return rows


def write_csv(rows: list[dict[str, str]]) -> None:
    fieldnames = list(rows[0].keys())
    with LEDGER_CSV.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(rows: list[dict[str, str]]) -> None:
    summary = defaultdict(int)
    by_issue = defaultdict(int)
    for row in rows:
        summary[row["state"]] += 1
        by_issue[row["owner_issue"]] += 1

    payload = {
        "generated_from": str(TIMELINE_PATH),
        "source_reports": [
            str(HANDOFF_REPORT),
            str(ACTIONABLE_REPORT),
            str(BLUEPRINT_REPORT),
            str(ADVERSARIAL_REPORT),
        ],
        "row_count": len(rows),
        "narrated_comment_rows": sum(1 for r in rows if r["finding_kind"] == "narrated"),
        "visual_only_rows": sum(1 for r in rows if r["finding_kind"] == "visual-only"),
        "state_summary": dict(summary),
        "owner_issue_summary": dict(sorted(by_issue.items())),
        "rows": rows,
    }
    LEDGER_JSON.write_text(json.dumps(payload, indent=2) + "\n")


def write_crosswalk(rows: list[dict[str, str]]) -> None:
    rows_by_issue: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        rows_by_issue[row["owner_issue"]].append(row)

    lines = [
        "# Finding Crosswalk",
        "",
        "Date: 2026-03-11",
        "Scope: March 10 recording backlog closure Wave 0.",
        "",
        "This crosswalk is generated from the authoritative ledger and the active atomic issue set `TER-690` through `TER-714`.",
        "",
        "## Summary",
        "",
        f"- Total rows: `{len(rows)}`",
        f"- Narrated rows: `{sum(1 for r in rows if r['finding_kind'] == 'narrated')}`",
        f"- Visual-only rows: `{sum(1 for r in rows if r['finding_kind'] == 'visual-only')}`",
        "",
    ]

    for issue in sorted(rows_by_issue):
        issue_rows = rows_by_issue[issue]
        lines.extend(
            [
                f"## {issue} - {ISSUE_TITLES[issue]}",
                "",
                f"- Proof contract: `{PROOF_REQUIREMENTS[issue]}`",
                f"- Row count: `{len(issue_rows)}`",
                f"- URL: {ISSUE_URLS[issue]}",
                "",
                "| Row IDs | Current states | Notes |",
                "| --- | --- | --- |",
            ]
        )
        chunks = [issue_rows[i : i + 12] for i in range(0, len(issue_rows), 12)]
        for chunk in chunks:
            ids = ", ".join(row["finding_id"] for row in chunk)
            states = ", ".join(
                f"{row['finding_id']}={row['state']}" for row in chunk[:4]
            )
            if len(chunk) > 4:
                states += ", ..."
            notes = chunk[0]["notes"]
            lines.append(f"| {ids} | {states} | {notes} |")
        lines.append("")

    CROSSWALK_MD.write_text("\n".join(lines) + "\n")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = build_rows()
    write_csv(rows)
    write_json(rows)
    write_crosswalk(rows)
    print(f"Wrote {len(rows)} rows to {LEDGER_CSV}")
    print(f"Wrote {LEDGER_JSON}")
    print(f"Wrote {CROSSWALK_MD}")


if __name__ == "__main__":
    main()
