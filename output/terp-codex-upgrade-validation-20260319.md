# TERP Codex Upgrade Validation - 2026-03-19

Short verdict: pass_with_tweaks.

The verifier overlay is mostly solid, and the Orders runtime generators are factually aligned on the big TER-795 / TER-788 / build-mmwp9o9e truths. The router overlay is the weak point: it passes the curated pack but only 4/8 adversarial TERP cases, including misclassifying the exact skeptical validation prompt into feedback-compilation.

Top findings:
- High: router review prompts are over-boosted into code-change or feedback-compilation.
- Medium: mixed design-pack plus package/config changes can be under-classified as light risk.
- Medium: ACTIVE_GATE_STATUS drops manifest-only nuance and inflates worktree pressure with its own generated/untracked artifacts.
- Low: PROOF_BUDGET is correct but verbose and repetitive enough that people may ignore it.

Primary artifacts:
- /Users/evan/.codex/automation-stack/reports/router-terp-overlay-validation-rerun-20260319.json
- /Users/evan/.codex/automation-stack/reports/router-terp-overlay-adversarial-20260319.json
- /Users/evan/.codex/automation-stack/reports/verifier-terp-overlay-validation-rerun-20260319.json
- /Users/evan/.codex/automation-stack/reports/verifier-terp-overlay-adversarial-20260319.json
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/output/status-orders-runtime-all-20260319.txt

PASTEBACK_FOR_CODEX

overall_verdict: pass_with_tweaks
confidence: high

what_is_working:
- The curated router fixture pack still passes 6/6.
- The verifier overlay handles docs-only, tests-only, mixed runtime+docs, and heavy inventory/auth/payment surfaces correctly.
- ACTIVE_GATE_STATUS and PROOF_BUDGET both reflect the core current truth: G2 / TER-788 active, TER-795 active atomic card, build-mmwp9o9e current deployed blocker, narrow fill-handle rerun as the next command, and TER-796 sealed.

findings:
- severity: high
  component: router
  issue: Read-only TERP review prompts are still misrouted into code-change or feedback-compilation.
  why_it_matters: This is the exact class of prompt that should reduce coordination burden, and it currently pushes the wrong workflow on skeptical validation/audit tasks.
  exact_evidence: router-terp-overlay-adversarial-20260319.json shows 4/8 pass rate. router-adv-001 and router-adv-002 are review-only prompts but route to code-change; router-adv-007 is the exact upgrade-set validation prompt and routes to feedback-compilation.
  suggested_tweak: Add deterministic review tokens like read-only, validate, validation pass, skeptical, mismatch, drift, stale, align, confirm next unblock to code-review; when those appear, suppress TERP code-change boosts from fill-handle, proof loop, next unblock, and TER ticket regexes.
  reproduction: python3 /Users/evan/.codex/skills/codex-session-router/scripts/route_session.py --prompt "You are doing a skeptical, read-only validation pass on a TERP-specific Codex upgrade set. Your job is not to improve anything yet. Your job is to break it, prove whether it helps or hurts, and return a structured feedback packet for targeted fixes." --cwd "/Users/evan/spec-erp-docker/TERP"
- severity: medium
  component: verifier
  issue: Mixed design-pack plus package/config changes can be downgraded to light.
  why_it_matters: A change set that touches design-pack assets and package/dependency config should not get the same bundle as pure SVG/doc generation work.
  exact_evidence: verifier-adv-006 returns light for [scripts/generate-spreadsheet-native-figma-pack.mjs, docs/design/.../orders-document.svg, package.json].
  suggested_tweak: Keep the design-pack light shortcut only if every file stays inside design/doc/generated surfaces and explicitly exclude package.json plus generic config/dependency files before returning light.
  reproduction: python3 /Users/evan/.codex/skills/codex-risk-verifier/scripts/classify_verification.py --mode ux-audit --changed-file scripts/generate-spreadsheet-native-figma-pack.mjs --changed-file docs/design/spreadsheet-native-march-2026/orders-document.svg --changed-file package.json
- severity: medium
  component: active_gate_status
  issue: The generated status view drops manifest-only nuance and counts its own generated/untracked artifacts as worktree pressure.
  why_it_matters: That makes the coordination view less trustworthy under pressure and pushes it toward process theater.
  exact_evidence: ACTIVE_GATE_STATUS.md omits the manifest guard that SALE-ORD-030 and SALE-ORD-032 are the only rows currently safe to treat as live-proven, because generate-orders-runtime-active-gate-status.mjs prefers gate-doc nextUnblock over manifest next_required_runtime_check. The same file reports current worktree dirty entries 28 after generation, and git status shows ACTIVE_GATE_STATUS.md, PROOF_BUDGET.md, and output/ are untracked.
  suggested_tweak: Prefer the manifest next_required_runtime_check when it is stricter, or split the output into separate bullets for live-proven rows, TER-796 seal rule, next command, and limitation fallback. For pressure, ignore generator-owned outputs/untracked files or use tracked-only dirty counts.
  reproduction: cd /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318 && pnpm status:orders-runtime:all && git status --short
- severity: low
  component: proof_budget
  issue: The proof budget is directionally correct but too repetitive and not explicit enough about the single remaining fresh rerun.
  why_it_matters: If a guardrail doc takes too long to parse, people stop using it and the process value disappears.
  exact_evidence: PROOF_BUDGET.md repeats the same narrow-probe sentence under both the narrow-probe bullet and the browser-budget reset rule, while the one-rerun-left rule is buried in prose under Cheapest Next Probe.
  suggested_tweak: Replace the duplicate paragraph with a single explicit line such as Remaining fresh deployed-build reruns: 1, then keep separate bullets for TER-796 sealed and SALE-ORD-022 limitation fallback.
  reproduction: sed -n '1,220p' /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md

missed_test_cases_to_add:
- component: router
  case: Read-only TERP validation prompt with skeptical, validation pass, do not implement, and feedback packet wording.
  expected_behavior: code-review
  actual_behavior: feedback-compilation
- component: router
  case: TERP tracker drift prompt using compare plus mismatches instead of review.
  expected_behavior: code-review
  actual_behavior: research-only
- component: router
  case: Review-only proof-loop prompt containing fill-handle and proof loop keywords.
  expected_behavior: code-review
  actual_behavior: code-change
- component: verifier
  case: Design-pack generator plus package.json.
  expected_behavior: normal
  actual_behavior: light
- component: active_gate_status
  case: Manifest carries stricter next_required_runtime_check than the gate doc next unblock.
  expected_behavior: generated status preserves the stricter nuance
  actual_behavior: generated status drops the manifest-only guard text
- component: workflow
  case: Generated coordination docs referenced as key docs while remaining untracked in the worktree.
  expected_behavior: either tracked shared snapshots or clearly local-only outputs that do not count as shared coordination truth
  actual_behavior: untracked local docs are treated like required coordination inputs

overhead_risks:
- The router looks good on curated fixtures but is still brittle on real TERP review prompts, which creates false confidence.
- ACTIVE_GATE_STATUS and PROOF_BUDGET are untracked local artifacts while AGENTS tells other agents to consult them as key docs.
- Worktree-pressure numbers are noisy because generating artifacts increases the dirty count they report.
- PROOF_BUDGET duplicates long prose instead of surfacing the one rule most people need: one fresh deployed-build rerun remains.

recommended_next_tweaks:
- priority: 1
  target: /Users/evan/.codex/skills/codex-session-router/scripts/route_session.py
  change: Add a review-first suppression branch for read-only, validation, skeptical, drift, mismatch, stale, and align-only TERP prompts before TERP code-change boosts are applied.
  rationale: This fixes the largest real misrouting without making the router fuzzier.
- priority: 2
  target: /Users/evan/.codex/skills/codex-risk-verifier/scripts/classify_verification.py
  change: Gate the design-pack light shortcut so it cannot fire when package.json or other config/dependency files are present.
  rationale: This removes the only observed false-light bundle while preserving the intended docs/design fast path.
- priority: 3
  target: /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/generate-orders-runtime-active-gate-status.mjs and orders-runtime-status-lib.mjs
  change: Preserve manifest-only guard nuance in Next Unblock and exclude generator-owned outputs/untracked files from worktree-pressure counts.
  rationale: This makes the coordination file more trustworthy and less self-noisy.
- priority: 4
  target: /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/generate-orders-runtime-proof-budget.mjs
  change: Collapse duplicate browser-budget prose and add an explicit remaining-reruns count.
  rationale: Higher signal, lower process burden.

commands_run:
- rg -n "TER-795|orders-runtime|router overlay|risk verifier|codex-session-router|proof budget|ACTIVE_GATE_STATUS|PROOF_BUDGET" /Users/evan/.codex/memories/MEMORY.md
- python3 /Users/evan/.codex/skills/codex-session-router/scripts/route_session.py --prompt "You are doing a skeptical, read-only validation pass on a TERP-specific Codex upgrade set. Your job is not to improve anything yet. Your job is to break it, prove whether it helps or hurts, and return a structured feedback packet I can paste back into another Codex thread for targeted fixes." --cwd "/Users/evan/spec-erp-docker/TERP" --log
- python3 ... router benchmark rerun script reading /Users/evan/.codex/automation-stack/benchmarks/router-terp-prompts.json and writing router-terp-overlay-validation-rerun-20260319.json plus router-terp-overlay-adversarial-20260319.json
- python3 ... verifier benchmark rerun script reading /Users/evan/.codex/automation-stack/benchmarks/verifier-terp-cases.json and writing verifier-terp-overlay-validation-rerun-20260319.json plus verifier-terp-overlay-adversarial-20260319.json
- cd /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318 && pnpm status:orders-runtime:all
- git -C /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318 status --short

artifacts_written:
- /Users/evan/.codex/automation-stack/reports/router-terp-overlay-validation-rerun-20260319.json
- /Users/evan/.codex/automation-stack/reports/router-terp-overlay-adversarial-20260319.json
- /Users/evan/.codex/automation-stack/reports/verifier-terp-overlay-validation-rerun-20260319.json
- /Users/evan/.codex/automation-stack/reports/verifier-terp-overlay-adversarial-20260319.json
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/output/status-orders-runtime-all-20260319.txt
