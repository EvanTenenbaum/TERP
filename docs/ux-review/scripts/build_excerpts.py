#!/usr/bin/env python3
"""
Extract a short baseline excerpt for each page in page_inventory.json.
Writes excerpts_all/<key>.md.

Strategy: read FUNCTIONAL_BASELINE.md, chunk at "### Page:" boundaries, then for each
page in the inventory find the best-matching chunk by component name. For workspaces
with tabs, include the workspace-level section + the tab-specific content.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASELINE = (ROOT / "baseline/FUNCTIONAL_BASELINE.md").read_text()
RUNTIME = (ROOT / "baseline/FUNCTIONAL_BASELINE_RUNTIME.md").read_text()
INV = json.loads((ROOT / "scripts/page_inventory.json").read_text())
OUT = ROOT / "excerpts_all"
OUT.mkdir(parents=True, exist_ok=True)


def split_baseline_by_page(text):
    """Return dict: normalized-page-name -> excerpt (page heading + body up to next ### or ---)."""
    chunks = {}
    # Split into blocks at '### Page:' boundaries
    parts = re.split(r"\n(?=### Page: `)", text)
    for part in parts:
        m = re.match(r"### Page: `([^`]+)`", part)
        if not m:
            continue
        name = m.group(1)
        # Stop at the next ### heading (any) or at a --- line followed by ### at the same level
        body = part
        # Truncate body at the first '\n---\n' followed by '### Page:' or '## '
        cut = re.search(r"\n---\n\s*### (?:Page:|)", body)
        if cut:
            body = body[: cut.start()]
        chunks[name] = body.strip()
    return chunks


def find_runtime_excerpt(page_name):
    """Grep the runtime supplement for the page name."""
    # Try to find a heading or first paragraph mentioning the component
    key = page_name.split(".")[0]  # e.g. SalesWorkspacePage
    # Look for lines mentioning the key
    hits = []
    for para in RUNTIME.split("\n\n"):
        if key in para or page_name in para:
            hits.append(para.strip())
    return "\n\n".join(hits[:3])


BASELINE_CHUNKS = split_baseline_by_page(BASELINE)
print(f"Parsed {len(BASELINE_CHUNKS)} page chunks from baseline")


def excerpt_for(item):
    key = item["key"]
    name = item["name"]
    depth = item["depth"]
    route = item["route"]

    # Normalize name (strip .tabname or parenthetical)
    base_name = re.split(r"[.(]", name)[0].strip()

    # Try exact and fuzzy matching
    baseline_body = ""
    if name in BASELINE_CHUNKS:
        baseline_body = BASELINE_CHUNKS[name]
    elif base_name in BASELINE_CHUNKS:
        baseline_body = BASELINE_CHUNKS[base_name]
    else:
        # Fuzzy: match by lowercase containment
        for chunk_key, chunk_body in BASELINE_CHUNKS.items():
            if base_name.lower() in chunk_key.lower() or chunk_key.lower() in base_name.lower():
                baseline_body = chunk_body
                break

    if not baseline_body:
        # Look up common lazy-surface components
        custom_map = {
            "InventoryWorkspacePage.inventory": "InventoryWorkspacePage",
            "InventoryWorkspacePage.intake": "InventoryWorkspacePage",
            "InventoryWorkspacePage.receiving": "InventoryWorkspacePage",
            "InventoryWorkspacePage.shipping": "InventoryWorkspacePage",
            "SalesWorkspacePage.orders": "SalesWorkspacePage",
            "SalesWorkspacePage.quotes": "SalesWorkspacePage",
            "SalesWorkspacePage.returns": "SalesWorkspacePage",
            "SalesWorkspacePage.sales-sheets": "SalesWorkspacePage",
            "RelationshipsWorkspacePage.clients": "RelationshipsWorkspacePage",
            "RelationshipsWorkspacePage.suppliers": "RelationshipsWorkspacePage",
            "AccountingWorkspace.invoices": "AccountingWorkspacePage",
            "Settings.users": "Settings",
            "Settings.roles": "Settings",
            "Settings.locations": "Settings",
        }
        if name in custom_map and custom_map[name] in BASELINE_CHUNKS:
            baseline_body = BASELINE_CHUNKS[custom_map[name]]

    if not baseline_body:
        baseline_body = f"(No direct baseline section found for `{name}`. Route: `{route}`. Rely on the screenshot and runtime note.)"

    # Keep excerpts compact — full chunk is usually 15-30 lines, fine
    runtime_note = find_runtime_excerpt(base_name)

    excerpt = f"""# Baseline excerpt for `{name}`

**Route:** `{route}` — Depth: **{depth}**

## From FUNCTIONAL_BASELINE.md

{baseline_body}

## Runtime supplement (if any)

{runtime_note or '(no runtime supplement match)'}
"""
    (OUT / f"{key}.md").write_text(excerpt)
    return len(excerpt)


total = 0
for item in INV:
    n = excerpt_for(item)
    total += n
print(f"Wrote {len(INV)} excerpts, {total:,} chars total")
