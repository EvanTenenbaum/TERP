# Agent Prompt: Wave 3 - Workstream C (QA Follow-up)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with fixing issues identified during Wave 2 QA reviews.

### Your Mission

Your focus is on fixing bugs and adding missing tests. You will work in parallel with other agents.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md` (look for "Wave 2 QA Follow-Up Tasks")
2. **Wave 2 Gemini QA Review:** `docs/reviews/WAVE2_GEMINI_REVIEWS.md` (hypothetical file, but you can find the issues in the roadmap)

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b fix/wave2-qa-followup
```

### File Ownership

**You have permission to modify files across the codebase as needed to complete these tasks.**

---

## 2. Your Tasks (22.5h total)

| Task ID   | Title                                               | Est. Hours |
| --------- | --------------------------------------------------- | ---------- |
| QA-W2-001 | Fix N+1 query in `getBatchCodesByIds`               | 2h         |
| QA-W2-002 | Complete frontend display for intake quantity       | 4h         |
| QA-W2-003 | Add unit tests for `spreadsheetViewService.ts`      | 4h         |
| QA-W2-004 | Implement QA-TEST-002: Fix VIP Appointment dates    | 1h         |
| QA-W2-005 | Integrate `useUnsavedChangesWarning` with auto-save | 2h         |
| QA-W2-007 | Implement CHAOS-022: Fix Sidebar Menu Length        | 2h         |
| QA-W2-008 | Implement CHAOS-026: Fix Duplicate Menu Icons       | 2h         |
| QA-W2-009 | Add unit tests for `useInventoryFilters.ts`         | 3h         |
| QA-W2-010 | Add unit tests for `TeriCodeLabel` component        | 2h         |
| QA-W2-006 | Remove or document `_lastSavedDraftId`              | 0.5h       |

**Implementation Guidance:**

- **QA-W2-001:** Implement a bulk fetch method for batches to avoid the N+1 query.
- **QA-W2-002:** Add the "Original Intake Qty" column to `InventoryGrid.tsx`.
- **QA-W2-004:** Use dynamic dates in the VIP appointment tests.
- **QA-W2-005:** Ensure the unsaved changes warning is triggered correctly when auto-save is pending.
- **QA-W2-007:** Make the sidebar menu scrollable when it overflows.
- **QA-W2-008:** Fix the duplicate menu icons in the navigation.
- **Add tests** for all new and modified logic.

---

## 3. Completion Protocol

1. **Implement all tasks** on your `fix/wave2-qa-followup` branch.
2. **Run `pnpm check` and `pnpm test`** to ensure all checks pass.
3. **Create a Pull Request** to `main` with a clear title and summary.
4. **Generate a Reviewer Prompt** for a new Manus agent to QA and merge your work.

**Example Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Wave 2 QA Follow-up

**Branch:** `fix/wave2-qa-followup`

**Tasks to Verify:**

- [ ] **QA-W2-001:** Verify N+1 query is fixed.
- [ ] **QA-W2-002:** Verify intake quantity is displayed.
- [ ] **QA-W2-004:** Verify VIP appointment tests use dynamic dates.
- [ ] **QA-W2-005:** Verify unsaved changes warning works with auto-save.
- [ ] **QA-W2-007:** Verify sidebar menu is scrollable.
- [ ] **QA-W2-008:** Verify duplicate menu icons are fixed.
- [ ] **Verify all new tests pass.**

**Instructions:**

1. Checkout the branch.
2. Run `pnpm check` and `pnpm test`.
3. Perform a thorough Gemini Pro QA review.
4. If approved, merge to main.
```

---

Good luck! Your work is critical for improving the quality and stability of the codebase.
