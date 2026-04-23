# Claude Opus 4.7 — API & prompting notes for the TERP all-pages audit

Source: https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7
Released: April 16, 2026 · GA.

## Model identifier

- **`claude-opus-4-7`** — canonical Anthropic API model ID.
- 1M-token context, 128k max output, adaptive thinking.
- Pricing parity with 4.5/4.6: $2.50/$12.50 per MTok standard; $2.50/$12.50 batch.

## Vision

- High-res image support: **2576 px / 3.75 MP** (up from 1568 px / 1.15 MP).
- **1:1 coordinate mapping** with actual pixels — no scale-factor math needed for bounding-box/localization tasks. This is ideal for "mark the UI element at (x,y) that's wrong" feedback.
- Measurable improvements on low-level perception (pointing/measuring/counting) and localization.
- Downsample if full fidelity isn't required, to control tokens.
- Vision is invoked by passing images as message content blocks (`{type:"image", source:{type:"base64",media_type:"image/webp",data:…}}`).

## Extended thinking (now "adaptive thinking")

- **Adaptive thinking is off by default** in 4.7. Must explicitly set `thinking: {"type": "adaptive"}`.
- To stream reasoning to the user, add `"display": "summarized"` (thinking content is otherwise omitted from responses by default).
- Extended-thinking budgets are removed — adaptive thinking tunes automatically.
- Effort levels: `low`, `medium`, `high`, **`xhigh`** (new). Start with `xhigh` for coding/agentic.
- `xhigh` costs more tokens but outperforms `high` on complex reasoning. Good for design-critique work with long context.

## Task budgets (beta)

- Beta header `task-budgets-2026-03-13`.
- `task_budget` is advisory across an agentic loop (not a hard cap). Minimum 20k.
- For open-ended quality-over-speed tasks, omit `task_budget` and reserve it for workloads where the model needs a budget suggestion.

## Sampling params

- `temperature`, `top_p`, `top_k` return 400 if set to non-default on 4.7. Omit them. Use prompting for determinism.

## Behavior changes relevant to design-critique prompting

- More literal instruction-following: state exactly what you want, don't rely on generalization.
- Response length calibrates to perceived complexity (harder tasks → longer answers), so don't cap output arbitrarily.
- Fewer tool calls by default — raise effort if the model should use more tools.
- More direct, opinionated tone; fewer emoji; less validation-forward phrasing. Good for critique.

## Prompting template for per-page design critique

Based on the model's strengths (vision, 1:1 coords, adaptive thinking, xhigh effort, literal instruction):

```python
client.messages.create(
    model="claude-opus-4-7",
    max_tokens=8000,
    thinking={"type": "adaptive", "display": "summarized"},
    output_config={"effort": "xhigh"},
    system=SYSTEM_PROMPT_DESIGN_CRITIC,  # expert UI/UX critic persona
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/webp", "data": b64_screenshot}},
            {"type": "text", "text": PAGE_BRIEF},  # page name, URL, baseline excerpt, runtime excerpt, what we want back
        ],
    }],
)
```

## System-prompt pattern (author: design-critic persona)

> You are a senior product-design critic who has shipped complex internal B2B tools at scale (linear, Ramp, Rippling, modern ERPs). You are evaluating a single page of a hemp-wholesale ERP called TERP.
>
> For every page you evaluate, return a strict JSON object with:
> 1. `page_assessment` — one-paragraph honest assessment of what works and what doesn't, grounded in observable layout/hierarchy/affordance problems.
> 2. `findings` — array of findings. Each finding has: `id` (e.g. `UX-42`), `severity` (P0/P1/P2/P3), `surface` (page name), `title`, `what_is_wrong`, `why_it_matters`, `proposed_fix`, `functionality_preserved` (name the exact baseline component / tRPC router / business rule the fix must not disturb, and how).
> 3. `redesign_sketch` — a short textual sketch of how the redesigned page should look (heading + action pattern, primary organization, row/column structure, microcopy). No code.
> 4. `notable_strengths` — 1–3 things the page already does well that a redesign must preserve.
>
> Strict constraints: every finding must reference an observable visual/interactive element in the screenshot, or an item in the runtime baseline I provide. Do not propose removing any functionality documented in the baseline. Prefer layout/hierarchy/defaults/discoverability fixes over behavior changes.

## Notes for parallelization

- Each page call is independent. Ideal for `parallel_processing`.
- Cost estimate: 60 pages × (~5k input tokens + ~3k output) × xhigh ≈ $3–6 for input + $2–3 for output ≈ **$5–10 total**. Adaptive thinking adds ~30–60% → $8–15 realistic.
- If budget concerns arise, drop to `effort: "high"` for lightweight-depth pages and keep `xhigh` for the 15–20 daily-use pages.


## Additional vision guidance (from `platform.claude.com/docs/en/build-with-claude/vision`)

- **Images-first ordering**: "Claude works best when images come before text." I must put the screenshot content block before the brief.
- **Native resolution for Opus 4.7**: 4784 tokens, ≤2576 px on long edge. Images above this are auto-resized, keeping aspect ratio, padded bottom-right to multiple of 28 px.
- **Coordinate system**: When the model returns coordinates, they're relative to the resized/padded image. To keep UX-finding coordinates useful for a developer, I should pre-resize screenshots to ≤2576 px and reference pixel positions in the resized space.
- **Image clarity / legibility**: text must be legible in the screenshot. Our staging screenshots are captured at 1440-wide webp; confirmed legible. Don't over-compress.
- **Cost per screenshot on 4.7**: 1920×1080 ≈ 2765 tokens ≈ $0.014/img at $5/MTok; 2576×1440 ≈ 4000 tokens ≈ $0.020. Plan budget.
- **Up to 100 images per 200k-context request**, 600 per request otherwise. Our approach: one image per per-page call is trivially within limits.
- **Use the Files API** if uploading many images across many requests (avoids bloating each call). For a single per-page call this isn't required.

## Confirmed go-plan

1. Pre-resize each screenshot to max 2560px on long edge, WebP quality 85.
2. API call template:
   ```python
   client.messages.create(
       model="claude-opus-4-7",
       max_tokens=8000,
       thinking={"type": "adaptive", "display": "summarized"},
       output_config={"effort": "xhigh"},  # for daily-use pages
       # or "high" for lightweight-audit pages
       system=SYSTEM_PROMPT_DESIGN_CRITIC,
       messages=[{
           "role": "user",
           "content": [
               {"type": "image", "source": {"type":"base64","media_type":"image/webp","data":b64}},
               {"type": "text", "text": per_page_brief},
           ],
       }],
   )
   ```
3. Structured-JSON response expected. Validate and append to `findings.jsonl`.
4. Parallelize across ~60 pages using the `map` tool, one subtask per page (each runs Python against `ANTHROPIC_API_KEY`).
