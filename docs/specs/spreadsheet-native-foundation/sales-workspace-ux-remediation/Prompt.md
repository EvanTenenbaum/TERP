# Objective

Repair the highest-friction sales workspace UI and UX issues on the unified `/sales` route so that order deep links resolve to the correct surface, the create-order entry is clearly distinct from the order queue, and mobile controls remain legible and reachable.

# Scope

- In scope:
- Sales workspace route normalization for malformed order-document deep links
- Order queue vs create-order IA clarity inside the sheet-native orders flow
- Sales workspace top-nav and command-strip mobile usability fixes
- Sheet/classic mode toggle state clarity and accessibility
- Targeted verification artifacts, roadmap QA, and implementation evidence
- Out of scope:
- Full redesign of Sales Catalogue, Orders queue, or Live Shopping
- New backend APIs or schema changes
- Production/staging deployment
- Broad copy sweeps outside the touched sales workspace surfaces

# Assumptions

- The malformed route `tab=sales-sheets&surface=sheet-native&ordersView=document` is unintended and should canonicalize to the orders document flow.
- "Create Order" confusion can be reduced meaningfully without a full navigation-system redesign.
- Mobile tab overflow should stay horizontally scrollable rather than moving to a separate overflow menu in this wave.

# Decision Hotspots

- Whether to rename the `Create Order` tab in this wave or defer the wording change while improving the in-surface context first
- How aggressively to canonicalize sales URLs that mix catalogue tabs with order-document params
- Whether to suppress staging-only Agentation console noise now or leave it as a follow-up infrastructure task

# Constraints

- Preserve unrelated in-flight edits in the dirty TERP worktree.
- Keep changes inside the current sales workspace UI layer unless a verification gap forces a wider touch.
- Prefer targeted proof over broad reruns until a ship-point bundle is warranted.
- Treat the Sales Catalogue empty state finding as deferred unless it can be solved with a narrowly scoped, non-redesign change. The current wave is not a catalogue redesign.

# Success Checks

- The malformed deep link resolves into the orders document flow instead of the Sales Catalogue surface.
- The create-order entry communicates "start a new order" more clearly than the queue/document entry path.
- The sheet/classic mode toggle exposes a consistent active state and does not clip on mobile command strips.
- Mobile sales tabs keep a clear overflow cue and reachable controls.
- The roadmap is pressure-tested with deterministic evidence and a Claude adversarial review before implementation closes.
- Mobile proof is collected at a minimum of `375px` and `414px` widths with a `44x44px` tap-target floor for the command-strip controls.
