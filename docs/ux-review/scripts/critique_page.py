#!/usr/bin/env python3
"""
Per-page TERP design critique using Claude Opus 4.7 (vision + adaptive thinking).

Usage:
    python3 critique_page.py \
        --screenshot /path/to/screenshot.webp \
        --page-name "DashboardHomePage" \
        --route "/" \
        --depth full|lightweight \
        --baseline-excerpt-file /path/to/baseline_excerpt.md \
        --runtime-excerpt-file  /path/to/runtime_excerpt.md \
        --out /path/to/findings.json

Reads ANTHROPIC_API_KEY from env.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from pathlib import Path

import anthropic

MODEL = "claude-opus-4-7"

SYSTEM_PROMPT = """You are a senior product-design critic with deep experience shipping internal B2B tools (Linear, Ramp, Rippling, modern ERPs). You evaluate one page at a time of a hemp/THCA wholesale ERP called TERP. Your critique will go directly into a usability-audit report that engineering will ship from, so every finding must be specific, observable, and non-destructive.

Core constraints you will honour on every page:
1. Every finding must reference an element you can literally see in the screenshot, or an item in the runtime/baseline text I provide. No hallucinated elements.
2. You must NOT propose removing any functionality documented in the baseline. Prefer fixes that touch layout, hierarchy, defaults, discoverability, copy, or hierarchy. If a behavior change is unavoidable, say so explicitly in `functionality_preserved`.
3. For every finding, name the exact baseline component, tRPC router, or business rule the fix must not disturb, and explain in one sentence how the fix preserves it.
4. Severity scale: P0 blocks a user or creates a dead-end; P1 slows a core workflow by ≥30%; P2 is friction/polish; P3 is cosmetic.
5. Be opinionated and direct. No hedging, no "could consider". Claim it or don't.
6. Your output is strict JSON matching the schema the user describes. No prose outside the JSON.
"""

OUTPUT_SCHEMA_DOC = """Return a single JSON object with these exact keys:

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

Do not wrap the JSON in markdown fences. Start with { and end with }.
"""


def build_user_text(
    page_name: str,
    route: str,
    depth: str,
    baseline_excerpt: str,
    runtime_excerpt: str,
) -> str:
    return f"""Page under review: **{page_name}** (route `{route}`)
Depth requested: {depth} (full = up to 8 findings + detailed redesign; lightweight = up to 3 findings + brief redesign)

Canonical baseline excerpt (source of truth for what MUST be preserved):
---
{baseline_excerpt.strip()}
---

Runtime observation excerpt (what the live page actually looks/behaves like):
---
{runtime_excerpt.strip() or "(no runtime excerpt supplied — rely on the screenshot + baseline)"}
---

The screenshot was captured from terp-staging-yicld.ondigitalocean.app signed in as qa.superadmin@terp.test. The screenshot has already been placed before this message.

{OUTPUT_SCHEMA_DOC}
"""


def image_content_block(path: Path) -> dict:
    data = base64.standard_b64encode(path.read_bytes()).decode("ascii")
    suffix = path.suffix.lower().lstrip(".")
    media_type = {
        "webp": "image/webp",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
    }.get(suffix, "image/webp")
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": data},
    }


def run(args):
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    baseline_excerpt = Path(args.baseline_excerpt_file).read_text() if args.baseline_excerpt_file else ""
    runtime_excerpt = Path(args.runtime_excerpt_file).read_text() if args.runtime_excerpt_file else ""

    user_text = build_user_text(
        page_name=args.page_name,
        route=args.route,
        depth=args.depth,
        baseline_excerpt=baseline_excerpt,
        runtime_excerpt=runtime_excerpt,
    )

    effort = "xhigh" if args.depth == "full" else "high"

    # Try Opus 4.7 first; fall back to 4.5 if the endpoint returns model_not_found.
    candidates = [MODEL, "claude-opus-4-5"]
    last_err = None
    for model in candidates:
        try:
            kwargs = dict(
                model=model,
                max_tokens=8000,
                system=SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": [image_content_block(Path(args.screenshot)), {"type": "text", "text": user_text}],
                }],
            )
            # Opus 4.7-specific features; 4.5 will ignore unknown fields but to be safe only send on 4.7
            if model == MODEL:
                kwargs["thinking"] = {"type": "adaptive", "display": "summarized"}
                kwargs["output_config"] = {"effort": effort}
            resp = client.messages.create(**kwargs)
            break
        except anthropic.BadRequestError as e:
            last_err = e
            msg = str(e)
            if "model" in msg.lower() and ("not_found" in msg.lower() or "invalid" in msg.lower()):
                print(f"[critique_page] Model {model} unavailable, trying next candidate ({msg})", file=sys.stderr)
                continue
            raise
    else:
        raise RuntimeError(f"All model candidates failed. Last error: {last_err}")

    # Extract text content (skip thinking blocks)
    text_out = ""
    for block in resp.content:
        if block.type == "text":
            text_out += block.text

    # Attempt to parse JSON
    text_stripped = text_out.strip()
    if text_stripped.startswith("```"):
        # strip code fences if model ignored instructions
        text_stripped = text_stripped.strip("`")
        if text_stripped.lower().startswith("json"):
            text_stripped = text_stripped[4:].strip()
    try:
        parsed = json.loads(text_stripped)
    except json.JSONDecodeError:
        parsed = {"raw_text": text_out, "parse_error": True}

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(parsed, indent=2))
    print(f"[critique_page] wrote {out_path}", file=sys.stderr)

    # Also print a short summary to stdout for pipeline logging
    if "findings" in parsed:
        print(f"{args.page_name}: {len(parsed['findings'])} findings")
    else:
        print(f"{args.page_name}: (parse failed or no findings)")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--screenshot", required=True)
    p.add_argument("--page-name", required=True)
    p.add_argument("--route", required=True)
    p.add_argument("--depth", choices=["full", "lightweight"], default="lightweight")
    p.add_argument("--baseline-excerpt-file", default="")
    p.add_argument("--runtime-excerpt-file", default="")
    p.add_argument("--out", required=True)
    args = p.parse_args()
    run(args)
