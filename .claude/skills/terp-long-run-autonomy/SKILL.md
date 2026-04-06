---
name: terp-long-run-autonomy
description: "Long unattended TERP execution protocol — one supervisor owns Linear structure and duplicate consolidation, workers stay in explicit lanes, completion requires implementation plus wiring plus functional proof, and any temporary run-specific guards must be cleaned up at the end"
---

# TERP Long-Run Autonomy

Use this skill for large unattended TERP runs:

- long one-shots
- remediation trains
- multi-agent bug-fix waves
- execution that continues while Evan is away
- any TERP run where duplicate Linear tickets, weak verification, or parallel collisions could quietly break trust

## Core model

Use one supervisor as the only authority for:

- Linear structure
- duplicate or overlap classification
- canonical issue ownership
- parent or child hierarchy
- final closeout state

All other agents are execution workers only.

## Required truth model

For every meaningful task, track separately:

- implementation
- wiring
- functional verification
- live-surface verification when required
- evidence state

Allowed evidence states:

- open
- partial
- closed with evidence
- rejected with evidence

A task is not complete unless all required categories are satisfied.

If implementation exists but wiring is not proven, the task remains `partial`.

If wiring is proven but functionality is not proven, the task remains `partial`.

## Duplicate and overlap rule

If Linear issues or findings overlap:

- do not dedupe by title alone
- compare flow, surface, severity, repro, environment, user impact, and fix scope
- classify each overlap as:
  - exact duplicate
  - duplicate with extra nuance
  - partial overlap
  - blocker
  - distinct

Before collapsing any duplicate source, transfer all unique nuance into the canonical item.

## Parallel rule

Keep serial:

- shared routes
- shared state
- shared components or primitives
- auth / RBAC
- accounting / data integrity
- infra or deployment-sensitive behavior
- anything with unclear overlap

Keep parallel-safe only for leaf work with explicit owned surfaces and no shared blockers.

## Verification rule

Never accept these as sufficient by themselves:

- screenshots
- visible UI only
- route exists only
- API 200 only
- "looks fixed"

Require proof for:

- implementation
- wiring into the real runtime path
- functional behavior
- negative-path or false-positive catching
- adjacent regression coverage
- live-surface proof when the surface is user-facing or deployment-sensitive

If verification produces no materially new evidence after 1-2 informative retries:

- stop rerunning
- record blocker
- record current evidence
- record the next atomic move

## Claude-specific defaults

- Use this skill with the TERP project agents when they fit:
  - `terp-implementer`
  - `terp-qa-reviewer`
- Prefer one supervisor plus at most two implementation lanes unless the user explicitly approves a broader swarm.
- If temporary run-specific hooks or local settings are added for the run, remove or disable them at the end unless explicitly told to keep them.
- After cleanup, verify unrelated TERP Claude configuration still works.

## Prompt kit

Use [prompt-kit.md](prompt-kit.md) for copy-ready supervisor, worker, and QA/evidence prompts.
