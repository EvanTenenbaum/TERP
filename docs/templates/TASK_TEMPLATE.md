### [TASK_ID]: [TASK_TITLE]

<!-- ⚠️ VALIDATION-CRITICAL FIELDS - Use exact values shown below -->
<!-- Status: ready | in-progress | complete | blocked (lowercase, no emojis) -->
<!-- Priority: HIGH | MEDIUM | LOW (uppercase, no P0/P1/P2) -->
<!-- Estimate: Use format like 4-8h, 16h, 2d, 1w (no "hours" or "days" spelled out) -->

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Risk Tier:** STRICT
**Gate Profile:** B + C + D
**Impact Mapping Confidence:** medium
**Module:** `path/to/module`
**Dependencies:** None
**Prompt:** `docs/prompts/[TASK_ID].md`
**Evidence Bundle:** `docs/execution/YYYY-MM-DD-[TASK_ID]/`

**Problem:**
[Describe the problem or need this task addresses.]

**Objectives:**

1. [Objective 1 - minimum 3 required for validation]
2. [Objective 2]
3. [Objective 3]

**Deliverables:**

- [ ] [Deliverable 1 - minimum 5 required for validation]
- [ ] [Deliverable 2]
- [ ] [Deliverable 3]
- [ ] [Deliverable 4]
- [ ] [Deliverable 5]
- [ ] QA Gate Declaration completed (`docs/templates/QA_GATE_DECLARATION_TEMPLATE.md`)
- [ ] Evidence bundle produced under `docs/execution/`

---

<!-- VALIDATION CHECKLIST:
- [ ] Status uses: ready, in-progress, complete, or blocked
- [ ] Priority uses: HIGH, MEDIUM, or LOW
- [ ] Estimate uses format like: 4-8h, 16h, 2d
- [ ] Risk Tier uses: SAFE, STRICT, or RED
- [ ] Gate Profile is listed
- [ ] Impact Mapping Confidence uses: high, medium, or low
- [ ] Module path is valid
- [ ] Prompt file exists at docs/prompts/[TASK_ID].md
- [ ] Prompt file has "## Implementation Guide" section
- [ ] At least 3 objectives listed
- [ ] At least 5 deliverables listed (using "- [ ]" format)
- [ ] Run: pnpm roadmap:validate before committing
-->
