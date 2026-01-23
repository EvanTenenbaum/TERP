# RISK_REGISTER.md

> **Purpose**: Track risks identified during UX strategy development with mitigation plans.
>
> **Severity Key**: H = High (P0 blocker), M = Medium (P1 address before GA), L = Low (P2 backlog)
>
> **Last Updated**: 2026-01-20 (PR #244 Red Hat QA Deep Review)

## Risk Scoring Methodology

**Risk Score = Probability × Impact**

| Probability | Score | Definition |
|-------------|-------|------------|
| High | 3 | >70% likelihood of occurring |
| Medium | 2 | 30-70% likelihood |
| Low | 1 | <30% likelihood |

| Impact | Score | Definition |
|--------|-------|------------|
| High | 3 | Data loss, financial error, or complete workflow failure |
| Medium | 2 | Degraded UX, partial functionality loss, user confusion |
| Low | 1 | Minor inconvenience, cosmetic issues |

**Severity Mapping**: H (≥6), M (3-5), L (1-2)

---

## Core Strategy Risks (Original)

| Risk ID | Risk | Trigger | Impact | Mitigation | Detection Method | Owner Role | Prob | Impact | Severity |
|---------|------|---------|--------|------------|------------------|------------|------|--------|----------|
| R-001 | Grid performance regression (virtualization) | Large datasets in Work Surface grid | Slow entry, timeouts | Implement virtualization + pagination; perf budgets | Lighthouse + runtime metrics | Frontend Eng | H | H | H |
| R-002 | Keyboard trap risk | Focus handling conflicts between grid and inspector | User stuck, lost input | Shared keyboard hook + focus tests | E2E keyboard tests | Frontend Eng | M | H | H |
| R-003 | Data integrity risk in compressed intake | Direct Intake auto‑creates multiple records | Inventory/accounting errors | Maintain event boundaries + service layer validation | Audit logs + reconciliation reports | Backend Eng | M | H | H |
| R-004 | UX drift across modules | Inconsistent pattern use by different teams | Fragmented UX, higher training cost | Playbook + checklist + code review gate | UX review checklist | Product/UX | H | M | H |
| R-005 | Feature loss during redesign | Missing mapping in preservation matrix | Critical functionality dropped | Feature matrix gate in PRs | Matrix audit before merge | PM/QA | M | H | H |
| R-006 | Testing gaps in golden flows | E2E suite incomplete or flaky | Undetected regressions | Add golden flow E2E tests + smoke tests | CI test reports | QA | H | M | H |
| R-007 | Modal dependency left in core flow | Legacy dialogs remain | Violates doctrine, slows flow | Modal audit + replacement with inspector | UI audit | UX/Frontend Eng | M | M | M |
| R-008 | Save‑state ambiguity | Inconsistent loading/error signals | User mistrust of save | Standardize save state component | UI regression tests | Frontend Eng | M | M | M |
| R-009 | Default values incorrect | Defaults not visible or wrong | Silent data errors | Require visible defaults + review | UX review + analytics | Product | M | M | M |
| R-010 | Inspector overload | Too many fields in panel | Cognitive overload | Progressive disclosure rules | Usability testing | UX | M | L | M |
| R-011 | Command palette misuse | Cmd+K used for field selection | Conflicting search models | Enforce playbook rules | UX review checklist | UX | M | M | M |
| R-012 | Accessibility regression | Keyboard/ARIA not maintained | WCAG violations | A11y tests + linting | Axe scans | Frontend Eng | M | M | M |
| R-013 | API mismatch with UI contracts | APIs lack needed states | Save state incorrect | Backend alignment + contract tests | Integration tests | Backend Eng | M | M | M |
| R-014 | Ledger mismatch with UI | Ledger rules not surfaced | Accounting errors | Map ledger flows from USER_FLOW_MATRIX | QA validation | Accounting SME | M | H | H |
| R-015 | API-only feature gap | Flow matrix lists API-only or UI-unknown features | Missing UI surfaces | UXS-005 audit + explicit API-only rationale | Matrix review | PM/QA | H | M | H |
| R-016 | Spec/repo drift | Docs out of sync with real UI behavior | Strategy misalignment | Periodic repo reality checks + audits | QA review checklist | Product/UX | M | M | M |

---

## Red Hat QA Identified Risks (2026-01-19)

| Risk ID | Risk | Trigger | Impact | Mitigation | Detection Method | Owner Role | Prob | Impact | Severity |
|---------|------|---------|--------|------------|------------------|------------|------|--------|----------|
| R-017 | Offline data loss | Network failure during long data entry | Unsaved work lost, user frustration | IndexedDB-backed offline queue (UXS-702) | Offline simulation testing | Frontend Eng | H | H | H |
| R-018 | Concurrent edit data corruption | Multiple users editing same record | Data overwritten, financial discrepancies | Optimistic locking via version field (UXS-705) | Two-browser E2E test | Backend Eng | M | H | H |
| R-019 | Session timeout work loss | Session expires during intake session | User loses 30+ minutes of work | Auto-save + session warning (UXS-706) | Session timeout simulation | Frontend Eng | M | H | H |
| R-020 | Mobile/tablet UX failure | Work Surface not responsive | Field staff cannot use on tablets | Responsive breakpoint system (UXS-701) | Device testing matrix | Frontend Eng | H | M | H |
| R-021 | Bulk operation server overload | User selects 1000+ items for bulk action | Server timeout, partial failures | Bulk operation limits (UXS-803) | Load testing | Backend Eng | M | H | H |
| R-022 | Error boundary gaps | Unhandled component error | Full page crash, user confusion | Error boundary wrapper (UXS-704) | Sentry monitoring | Frontend Eng | M | M | M |
| R-023 | Loading state confusion | No feedback during data fetch | User clicks repeatedly, duplicates | Skeleton loading components (UXS-703) | UI audit | Frontend Eng | M | M | M |
| R-024 | Undo window too short | User deletes, undo expires | Accidental deletion becomes permanent | 10s undo window (UXS-707) | User testing | UX | L | M | M |
| R-025 | Print output broken | Print stylesheet missing | Users can't print pick lists | Print stylesheet (UXS-903) | Print preview testing | Frontend Eng | M | M | M |
| R-026 | Export limits frustration | User needs 50K rows, limit is 10K | Manual workarounds, user complaints | Paginated export (UXS-904) | User feedback | Product | M | L | M |
| R-027 | Accessibility lawsuit risk | WCAG 2.1 AA violations | Legal liability, reputation damage | Accessibility audit (UXS-801) | axe-core CI integration | Frontend Eng | M | H | H |
| R-028 | RTL layout broken | i18n expansion to RTL markets | Product unusable in those markets | RTL layout support | RTL browser testing | Frontend Eng | L | M | L |
| R-029 | Animation jank | Complex transitions on low-end devices | Perceived slowness, frustration | Reduced motion + GPU-accelerated only | Performance profiling | Frontend Eng | M | L | M |
| R-030 | Empty state dead-end | No guidance when no data | User confused about next steps | Empty state components (UXS-901) | UI audit | UX | M | M | M |
| R-031 | Toast notification overload | Multiple concurrent notifications | Important info lost in stack | Toast stacking limit (3) (UXS-902) | UI audit | UX | M | L | M |
| R-032 | Form validation order mismatch | Client validates, server rejects | User confusion, wasted effort | Client+server validation alignment | Integration tests | Backend Eng | M | M | M |

---

## PR #244 Identified Risks (2026-01-20)

| Risk ID | Risk | Trigger | Impact | Mitigation | Detection Method | Owner Role | Prob | Impact | Severity |
|---------|------|---------|--------|------------|------------------|------------|------|--------|----------|
| R-033 | RBAC permission mismatch in golden flows | Work Surface deployed without role testing | Users blocked from workflows | RBAC validation matrix per golden flow | E2E tests per role | QA | H | H | H |
| R-034 | Missing modal replacement causes doctrine violation | Modal audit incomplete | Inconsistent UX, slow workflows | Complete modal inventory audit (UXS-601) | Code review checklist | Frontend Eng | M | M | M |
| R-035 | Feature flag rollback incomplete | Work Surface flag disabled but component still renders | Mixed UI state | Feature flag wrapper pattern | Integration tests | Frontend Eng | M | H | H |
| R-036 | Concurrent edit policy undefined | UXS-705 implemented without policy | Inconsistent conflict handling | Product decision before implementation | User testing | Product | H | M | H |
| R-037 | REL-* dependency gap | Accounting Work Surface before REL-008 complete | Data integrity risk in ledger | Enforce task dependencies | Roadmap review | PM | M | H | H |
| R-038 | VIP Portal UX drift | Main app uses Work Surface, VIP doesn't | User confusion between contexts | Product decision on VIP scope | UX audit | UX | L | M | L |

---

## Risk Response Categories

| Category | Definition | When to Use |
|----------|------------|-------------|
| **Mitigate** | Reduce probability or impact | Most risks |
| **Accept** | Acknowledge but take no action | Low severity + high mitigation cost |
| **Transfer** | Shift to third party | External dependencies |
| **Avoid** | Eliminate the risk source | P0 blockers |

---

## Risk Review Schedule

- **Weekly**: Review H severity risks
- **Bi-weekly**: Review M severity risks
- **Monthly**: Full risk register review + new risk identification
- **Per PR**: Check for new risks in changed areas

---

## Escalation Path

1. **Risk identified** → Add to register with owner
2. **Risk materializes** → Owner notifies PM + Tech Lead
3. **H severity unmitigated** → Escalate to Engineering Manager
4. **Customer-impacting** → Escalate to VP Engineering + notify support

---

## Closed Risks (Archive)

| Risk ID | Risk | Closure Date | Closure Reason |
|---------|------|--------------|----------------|
| *None yet* | | |
