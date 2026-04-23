#!/usr/bin/env python3
"""
Parallel critique runner: dispatch Opus 4.7 vision calls for all pages in page_inventory.json.

- Uses anthropic.AsyncAnthropic client
- Concurrency capped at 6 (TPM-safe for Opus 4.7)
- Each subtask: load screenshot + excerpt + runtime note, call API, write findings/<key>.json
- Retries on rate-limit / 529 overloaded, up to 3x with backoff

Usage:
    ANTHROPIC_API_KEY=... python3 scripts/run_all_critiques.py
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import sys
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent.parent
INV = json.loads((ROOT / "scripts/page_inventory.json").read_text())
SCREENS = ROOT / "screenshots_all"
EXCERPTS = ROOT / "excerpts_all"
NOTES = ROOT / "runtime_notes"
OUT = ROOT / "findings"
OUT.mkdir(parents=True, exist_ok=True)

MODEL = "claude-opus-4-7"
CONCURRENCY = int(os.environ.get("CONCURRENCY", "5"))
SKIP_EXISTING = os.environ.get("SKIP_EXISTING", "1") == "1"

SYSTEM_PROMPT = """You are a senior product-design critic with deep experience shipping internal B2B tools (Linear, Ramp, Rippling, modern ERPs). You evaluate one page at a time of a hemp/THCA wholesale ERP called TERP. Your critique will go directly into a usability-audit report that engineering will ship from, so every finding must be specific, observable, and non-destructive.

Core constraints you will honour on every page:
1. Every finding must reference an element you can literally see in the screenshot, or an item in the runtime/baseline text I provide. No hallucinated elements.
2. You must NOT propose removing any functionality documented in the baseline. Prefer fixes that touch layout, hierarchy, defaults, discoverability, copy, or typography. If a behavior change is unavoidable, say so explicitly in `functionality_preserved`.
3. For every finding, name the exact baseline component, tRPC router, or business rule the fix must not disturb, and explain in one sentence how the fix preserves it.
4. Severity scale: P0 blocks a user or creates a dead-end; P1 slows a core workflow by ≥30%; P2 is friction/polish; P3 is cosmetic.
5. Be opinionated and direct. No hedging, no "could consider". Claim it or don't.
6. Your output is strict JSON matching the schema the user describes. No prose outside the JSON. Do not wrap the JSON in markdown fences.
"""

SCHEMA_DOC = """Return a single JSON object with these exact keys:

{
  "page": "<page component name>",
  "route": "<route>",
  "assessment": "<1-paragraph honest assessment of what works and what doesn't>",
  "notable_strengths": ["<1-3 things the page does well that any redesign must preserve>"],
  "findings": [
    {
      "id": "UX-<n>",
      "surface": "<page component name>",
      "severity": "P0|P1|P2|P3",
      "title": "<short title>",
      "what_is_wrong": "<what you see that's wrong>",
      "why_it_matters": "<impact on the user>",
      "proposed_fix": "<concrete, specific fix>",
      "functionality_preserved": "<named baseline entity + how the fix preserves it>"
    }
  ],
  "redesign_sketch": "<short textual sketch of the redesigned page: heading pattern, primary organization, row/column structure, key microcopy. No code.>"
}

Start with `{` and end with `}`.
"""


def image_blocks(key: str):
    """Return a list of image content blocks. If _scrolled.png exists, include both."""
    blocks = []
    for suffix in ["", "_scrolled"]:
        path = SCREENS / f"{key}{suffix}.png"
        if not path.exists():
            continue
        data = base64.standard_b64encode(path.read_bytes()).decode("ascii")
        blocks.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": data},
        })
    return blocks


def user_text(item, baseline: str, runtime: str) -> str:
    return f"""Page under review: **{item['name']}** (route `{item['route']}`)
Depth: {item['depth']} (full = up to 8 findings + detailed redesign; lightweight = up to 3 findings + brief redesign)

Canonical baseline excerpt:
---
{baseline.strip()}
---

Runtime DOM observation from Playwright capture:
---
{runtime.strip()}
---

One or two screenshots from the live staging app (qa.superadmin@terp.test) are attached before this message. If two screenshots are attached, the first is the initial viewport and the second is scrolled down.

{SCHEMA_DOC}
"""


async def critique_page(client: anthropic.AsyncAnthropic, item: dict, sem: asyncio.Semaphore):
    key = item["key"]
    out_path = OUT / f"{key}.json"
    if SKIP_EXISTING and out_path.exists() and out_path.stat().st_size > 200:
        # Already done
        return f"[{key}] skipped (already exists)"

    excerpt = (EXCERPTS / f"{key}.md").read_text() if (EXCERPTS / f"{key}.md").exists() else ""
    runtime = (NOTES / f"{key}.md").read_text() if (NOTES / f"{key}.md").exists() else ""
    images = image_blocks(key)
    if not images:
        return f"[{key}] ERROR: no screenshot found"

    content = images + [{"type": "text", "text": user_text(item, excerpt, runtime)}]

    effort = "xhigh" if item["depth"] == "full" else "high"

    for attempt in range(3):
        try:
            async with sem:
                resp = await client.messages.create(
                    model=MODEL,
                    max_tokens=8000,
                    thinking={"type": "adaptive", "display": "summarized"},
                    output_config={"effort": effort},
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": content}],
                )
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            if text.startswith("```"):
                text = text.strip("`")
                if text.lower().startswith("json"):
                    text = text[4:].strip()
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = {"raw_text": text, "parse_error": True, "key": key}
            out_path.write_text(json.dumps(parsed, indent=2))
            n_findings = len(parsed.get("findings", [])) if isinstance(parsed, dict) else 0
            return f"[{key}] {n_findings} findings, {resp.usage.input_tokens} in / {resp.usage.output_tokens} out"
        except (anthropic.RateLimitError, anthropic.APIStatusError) as e:
            delay = 2 ** (attempt + 2)
            print(f"[{key}] {type(e).__name__} (attempt {attempt+1}), sleeping {delay}s", file=sys.stderr)
            await asyncio.sleep(delay)
        except Exception as e:
            return f"[{key}] FAILED: {type(e).__name__}: {e}"
    return f"[{key}] FAILED after 3 retries"


async def main():
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(critique_page(client, item, sem) for item in INV))
    print("\n".join(results))


if __name__ == "__main__":
    asyncio.run(main())
