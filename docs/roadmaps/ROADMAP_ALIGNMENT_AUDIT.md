# TERP Roadmap Alignment Audit

**Version:** 1.0
**Generated:** 2026-01-20
**Auditor:** Claude Code (Opus 4.5)
**Method:** Multi-source evidence analysis with conflict resolution

---

## A) Derived Source of Truth (SOT) Snapshot

### What TERP Currently IS

Based on comprehensive analysis of 54+ roadmap files, code reality, and documentation, TERP is:

**A Cannabis ERP System** providing:
- **Sales & CRM**: Client management, orders, quotes, invoices, live shopping
- **Inventory**: Batch/lot tracking, COGS, multi-site storage, photography queue
- **Purchasing**: Purchase orders, vendor supply, returns processing
- **Accounting**: AR/AP, general ledger, fiscal periods, bad debt management
- **Operations**: Pick & Pack, scheduling, calendar, workflow queue
- **VIP Portal**: Client self-service portal with live shopping integration
- **Admin**: RBAC, user management, feature flags, audit logs

### Current Agreed Feature Set (Evidence-Based)

| Module | Status | Evidence |
|--------|--------|----------|
| Core Sales (Orders, Clients, Invoices) | ✅ Production Ready | Routes in App.tsx, navigation.ts, 1,414+ tRPC procedures |
| Inventory Management | ✅ Production Ready | Full batch CRUD, movements, COGS calculations |
| Basic Accounting (Invoices, Payments) | ✅ Production Ready | GL posting hooks, fiscal periods |
| VIP Portal | ✅ Production Ready | Complete auth flow, dashboard, live shopping |
| Work Surfaces (9 components) | 🔶 Built Not Deployed | Components exist but NOT routed in App.tsx |
| Live Shopping | ✅ Enabled | BUG-073 fix removed feature flag requirement |
| Hour Tracking | 🔶 Backend Only | Router exists (`hourTracking.ts`), no frontend page |
| Photography Module | 🔶 Partial | Page exists but PhotographyModule not integrated |
| Email/SMS Notifications | ❌ Stubbed | `receipts.sendEmail` and `receipts.sendSms` throw NOT_IMPLEMENTED |
| Financial Reports | ❌ Not Implemented | `generateBalanceSheet`, `generateIncomeStatement` skipped in tests |

### Prioritized Source Authority (Tie-Break Rules Applied)

| Rank | Source | Path | Authority Reason |
|------|--------|------|------------------|
| 1 | **MASTER_ROADMAP.md** | `docs/roadmaps/MASTER_ROADMAP.md` | Most comprehensive, v6.5, last updated 2026-01-20, includes all task categories |
| 2 | **INCOMPLETE_FEATURES_AUDIT_JAN_2026.md** | `docs/reports/INCOMPLETE_FEATURES_AUDIT_JAN_2026.md` | Git-commit-verified findings from 484 commits |
| 3 | **FLOW_GUIDE.md** | `docs/reference/FLOW_GUIDE.md` | 100% router coverage, 1,414+ procedures documented |
| 4 | **07-deprecated-systems.md** | `.kiro/steering/07-deprecated-systems.md` | Canonical deprecation registry |
| 5 | **navigation.ts** | `client/src/config/navigation.ts` | Code reality for sidebar items |

**Sources Demoted Due to Staleness/Conflict:**
- `docs/roadmaps/README.md` - Last updated Jan 12, references "Prioritized Strategic Roadmap" as active but doesn't reflect Jan 20 updates
- `.kiro/steering/10-mvp-initiative.md` - References non-existent `MVP_ROADMAP.md`
- 50+ other roadmap files - Historical/superseded

### Confidence Map

#### HIGH Confidence (Strong Consistent Evidence)
- Core modules (Clients, Orders, Inventory, Invoices) - Multiple sources agree, code matches docs
- Work Surfaces exist but are not routed - MASTER_ROADMAP explicitly states this
- Deprecated `vendors` table - Documented in deprecated-systems.md, vendor router has deprecation warnings
- Feature flag system works - FeatureFlagsPage exists, routes use flags
- RBAC system implemented - 7 QA roles documented, seedRBAC.ts exists

#### MEDIUM Confidence (Some Conflict/Ambiguity)
- Which roadmap is "active" - README says PRIORITIZED_STRATEGIC, steering says MVP_ROADMAP, MASTER_ROADMAP appears most current
- MVP "72% resolved" vs "100% complete" - MASTER_ROADMAP summary shows conflicting percentages
- Work Surface deployment status - DEPLOY-001 marked "COMPLETE" but routes not in App.tsx

#### LOW Confidence (Missing/Contradictory Info)
- Total open task count - Different sources cite 30, 71, or 258 total tasks
- Current sprint/phase - Multiple sprint plans exist with no clear "current"
- Email/SMS implementation timeline - Marked as medium priority but critical for many workflows

---

## B) Roadmap Inventory

### Primary Roadmap Locations

| Location | File Count | Purpose |
|----------|-----------|---------|
| `docs/roadmaps/` | 54 files | Main roadmap storage |
| `product-management/initiatives/` | 9 initiatives | Feature initiatives |
| `.kiro/specs/` | 16 specs | Task-level specs |
| `.kiro/steering/` | 12 files | Agent guidance |

### Key Roadmap Files (Current)

| File | Version | Last Updated | Status |
|------|---------|--------------|--------|
| `MASTER_ROADMAP.md` | v6.5 | 2026-01-20 | **Canonical** |
| `INCOMPLETE_FEATURES_TASKS_2026-01-20.md` | - | 2026-01-20 | Active backlog |
| `PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md` | - | 2026-01-12 | Per README, was "active" |
| `README.md` (roadmaps) | - | 2026-01-12 | Index (stale) |

### Roadmap Overlap Analysis

**MASTER_ROADMAP.md** contains:
- MVP Milestone: 185 completed, 71 open, 2 removed = 258 total
- Beta Milestone: 0 completed, 30 open = 30 total
- Total: 288 tasks

**INCOMPLETE_FEATURES_AUDIT** added:
- 22 additional tasks from git commit analysis (deep QA pass)
- Verified as non-duplicates per Jan 20 QA note

**INCOMPLETE_FEATURES_TASKS** added:
- 37 new tasks (3 P0, 8 P1, 24 P2, 2 P3)

---

## C) Alignment Audit Table

### Legend
- ✅ ALIGNED: Correct and still part of current product truth
- ⚠️ AMBIGUOUS: Unclear due to conflicting evidence
- ❌ MISALIGNED: Based on deprecated/wrong assumptions
- 🧟 ZOMBIE: Exists but unreachable/unreferenced
- 🕳️ MISSING: Required feature implied by SOT but absent from roadmap

---

### MVP Infrastructure Tasks

| Task | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| ST-005 to ST-023 | ✅ ALIGNED | Completed infrastructure work | MASTER_ROADMAP shows ✅ COMPLETE | Low | Keep |
| INFRA-001 to INFRA-014 | ✅ ALIGNED | Completed infrastructure tasks | MASTER_ROADMAP shows ✅ COMPLETE | Low | Keep |
| INFRA-015, INFRA-016 | ✅ ALIGNED | Listed in INCOMPLETE_FEATURES_TASKS | P2 cleanup tasks | Low | Keep |

### MVP Security Tasks

| Task | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| SEC-001 to SEC-022 | ✅ ALIGNED | Completed security work | MASTER_ROADMAP shows ✅ COMPLETE | Low | Keep |
| **SEC-023** | ✅ ALIGNED (Critical) | Exposed DB credentials in git | `drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md` | **HIGH** | **Execute immediately** |

### MVP Bug Fixes

| Task | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| BUG-019 to BUG-099 | ✅ ALIGNED | All marked COMPLETE or FIXED | MASTER_ROADMAP | Low | Keep |
| **BUG-100** | ✅ ALIGNED (Critical) | 122 failing tests | `pnpm test` output | **HIGH** | Execute P0 |
| **TS-001** | ✅ ALIGNED (Critical) | 117 TypeScript errors | `pnpm run check` output | **HIGH** | Execute P0 |

### Work Surfaces Deployment

| Task | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| DEPLOY-001 | ⚠️ AMBIGUOUS | Marked COMPLETE but routes not in App.tsx | Code shows Work Surfaces NOT routed | **HIGH** | **Investigate** - verify actual state |
| DEPLOY-002 to DEPLOY-004 | ⚠️ AMBIGUOUS | Marked COMPLETE but unclear if gate scripts work | Package.json needs verification | Medium | Verify |
| DEPLOY-005 | ✅ ALIGNED | Stage 0 internal QA | Marked COMPLETE | Low | Keep |
| DEPLOY-006, DEPLOY-007 | ✅ ALIGNED | Skipped per Accelerated Validation | MASTER_ROADMAP note | Low | Keep as skipped |
| DEPLOY-008 | ⚠️ AMBIGUOUS | Marked COMPLETE but Work Surfaces behind disabled flags | Feature flags default false | **HIGH** | **Investigate** |

### Work Surface QA Blockers

| Task | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| **WSQA-001** | ✅ ALIGNED (Critical) | Payment recording is stub | `InvoicesWorkSurface.tsx:717-724` shows placeholder | **HIGH** | Execute P0 |
| **WSQA-002** | ✅ ALIGNED (Critical) | No flexible lot selection | INCOMPLETE_FEATURES_AUDIT | **HIGH** | Execute P0 |
| **WSQA-003** | ✅ ALIGNED (Critical) | Missing RETURNED order status | `schema.ts`, `ordersDb.ts:1564` | **HIGH** | Execute P0 |
| **ACC-001** | ✅ ALIGNED (Critical) | Silent GL posting failures | `accountingHooks.ts:173,224,274,323` | **HIGH** | Execute P0 |

### Navigation Accessibility

| Task | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| NAV-006 to NAV-016 | ✅ ALIGNED | 8 routes hidden from sidebar | `navigation.ts` vs `App.tsx` routes | Medium | Execute |

### Feature Tasks

| Task | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| FEAT-001 to FEAT-024 | ✅ ALIGNED | Most marked COMPLETE | MASTER_ROADMAP | Low | Keep |
| FEAT-005 | ✅ ALIGNED | Correctly REMOVED | "Current Quote/Sale workflow is intentional" | Low | Keep removed |
| **MEET-048** | ✅ ALIGNED | Hour Tracking backend done, no frontend | `hourTracking.ts` router exists, no page | Medium | Execute P1 |
| **WS-010** | ⚠️ AMBIGUOUS | Marked COMPLETE but Photography not integrated | PhotographyModule.tsx built but not used | Medium | **Reopen as WS-010A** |

### Beta Reliability Tasks

| Task | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| REL-001 to REL-017 | ✅ ALIGNED | All marked "ready" status | MASTER_ROADMAP Beta section | N/A | Keep for Beta |

### Deprecated/Zombie Items

| Item | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| `vendors` router | 🧟 ZOMBIE | Deprecated but still used | `07-deprecated-systems.md`, vendor router code | Medium | Create DEPR-001 migration task |
| `ordersEnhancedV2Router` | ❌ MISALIGNED | Listed as REMOVED but some code may reference | Deprecated-systems says "consolidated" | Low | Verify removal complete |
| RTL/i18n utilities | 🧟 ZOMBIE | 11 functions, 0 usages | `rtlUtils.ts` - no imports | Low | Execute ABANDONED-001 |
| Dashboard widgets-v2 | 🧟 ZOMBIE | 5 widgets built but not used | INCOMPLETE_FEATURES_AUDIT | Low | Execute FE-QA-011 |

### Missing Items (Not in Roadmap)

| Item | Classification | Why | Evidence | Impact | Recommendation |
|------|---------------|-----|----------|--------|----------------|
| Roadmap consolidation task | 🕳️ MISSING | 54 roadmap files with no cleanup plan | `docs/roadmaps/` directory | Medium | Add DOCS-001: Roadmap cleanup |
| README.md update | 🕳️ MISSING | Roadmap README is stale | Claims PRIORITIZED_STRATEGIC is active | Medium | Add DOCS-002: Update README |

---

## D) Conflict Resolution Ledger

### Conflict 1: Which Roadmap is Authoritative?

**Conflict Statement:** Multiple sources claim different roadmaps are "active"

**Sources:**
- `docs/roadmaps/README.md`: "Active Focus: PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md"
- `.kiro/steering/10-mvp-initiative.md`: "MVP Roadmap is THE primary initiative" (references `docs/roadmaps/MVP_ROADMAP.md` which doesn't exist)
- `docs/roadmaps/MASTER_ROADMAP.md`: Most recently updated (Jan 20), most comprehensive

**Resolution Decision:** **MASTER_ROADMAP.md is canonical**
- Most recent update (2026-01-20)
- Most comprehensive (258+ tasks)
- References and includes content from other roadmaps
- Contains actual task IDs used in code comments

**What to do next:** Update README.md to point to MASTER_ROADMAP.md as canonical source

---

### Conflict 2: DEPLOY-001 Status vs Code Reality

**Conflict Statement:** DEPLOY-001 marked COMPLETE but Work Surfaces not in App.tsx routes

**Sources:**
- `MASTER_ROADMAP.md:1352`: "DEPLOY-001 | Wire WorkSurfaceGate into App.tsx | **COMPLETE**"
- `INCOMPLETE_FEATURES_AUDIT:56-57`: "All 9 Work Surface components exist but are NOT wired into App.tsx routes"

**Resolution Decision:** **UNRESOLVED - Requires investigation**
- Possible: DEPLOY-001 wired the Gate component but feature flags remain off
- Possible: Work was partially done but not fully verified
- Possible: Documentation error

**What to do next:** Verify App.tsx for WorkSurfaceGate imports and routes; if missing, reopen DEPLOY-001

---

### Conflict 3: MVP Progress Percentage

**Conflict Statement:** MASTER_ROADMAP shows conflicting MVP completion percentages

**Sources:**
- `MASTER_ROADMAP.md:1159`: "MVP STATUS: 72% RESOLVED (185 completed + 2 removed, 71 tasks open)"
- `MASTER_ROADMAP.md:1693`: "MVP | 185 | 0 | 187 | 100%"

**Resolution Decision:** **72% is accurate**
- The 100% line appears to be from an earlier version not updated
- 71 open tasks documented in the MVP section
- Summary table at line 1693 contradicts detailed task lists

**What to do next:** Correct summary table to show 71 open tasks

---

### Conflict 4: WS-010 Photography Module Status

**Conflict Statement:** WS-010 marked COMPLETE but Photography module not integrated

**Sources:**
- `MASTER_ROADMAP.md:176`: "WS-010 | Photography Module | ✅ COMPLETE"
- `INCOMPLETE_FEATURES_AUDIT:141-156`: PhotographyModule (689 lines) built but never used
- `MASTER_ROADMAP.md:923-939`: WS-010A task exists to "Integrate Photography Module"

**Resolution Decision:** **WS-010 was prematurely closed**
- Component was built (correctly marked done)
- Integration into page was NOT done
- WS-010A correctly added to address this

**What to do next:** Keep WS-010A as P1 task; note WS-010 completion was partial

---

### Conflict 5: Feature Flags Default State

**Conflict Statement:** Work Surface flags documented as defaulting to false, but DEPLOY-008 (100% rollout) marked COMPLETE

**Sources:**
- `MASTER_ROADMAP.md:1252-1257`: Flags default false
- `MASTER_ROADMAP.md:1359`: DEPLOY-008 100% Rollout marked **COMPLETE**

**Resolution Decision:** **UNRESOLVED - Requires verification**
- If flags are still false, 100% rollout didn't happen
- If flags were enabled, DEPLOY-008 is correct

**What to do next:** Query feature_flags table to verify actual flag states

---

## E) "Do Not Build" List (Safety Guardrail)

### Features That Look Tempting But Should NOT Be Built

| Feature | Why Not | Evidence | Confidence |
|---------|---------|----------|------------|
| New vendor table integrations | `vendors` table is deprecated | `.kiro/steering/07-deprecated-systems.md:29-62` | HIGH |
| Custom ordersEnhancedV2 routes | Router was consolidated into main orders | `07-deprecated-systems.md:186-193` | HIGH |
| Railway deployment scripts | Platform is DigitalOcean now | `07-deprecated-systems.md:163-180` | HIGH |
| New `vendorId` foreign keys | Use `supplierClientId` instead | `07-deprecated-systems.md:70-88` | HIGH |
| Hard delete implementations | Use soft deletes with `deletedAt` | `07-deprecated-systems.md:125-139` | HIGH |
| `ctx.user?.id \|\| 1` patterns | Security vulnerability | `07-deprecated-systems.md:109-120` | HIGH |
| RTL/i18n feature expansion | Never implemented, 0 usages | `rtlUtils.ts` has no imports | MEDIUM |
| Expanding widgets-v2 | Planned for deprecation/migration | INCOMPLETE_FEATURES_AUDIT:555-568 | MEDIUM |
| Individual Work Surface flags | Use master `work-surface-enabled` first | Current pattern has granular flags unused | MEDIUM |

---

## F) Proposed Roadmap Edits (No Actual Changes Yet)

### Recommended Edits to MASTER_ROADMAP.md

#### 1. Fix MVP Summary Table (Line ~1693)

**Current:**
```markdown
| MVP | 185 | 0 | 187 | 100% |
```

**Proposed:**
```markdown
| MVP | 185 | 71 | 258 | 72% |
```

**Reason:** Matches detailed task counts above

---

#### 2. Clarify DEPLOY-001 Status

**Current:** `DEPLOY-001 | Wire WorkSurfaceGate into App.tsx | **COMPLETE**`

**Proposed:** Verify and either:
- If truly complete: Add note "Routes gated by feature flags (default off)"
- If incomplete: Change to `IN PROGRESS` with verification checklist

---

#### 3. Add Roadmap Cleanup Task

**Proposed new task:**

```markdown
| Task | Description | Priority | Status |
|------|-------------|----------|--------|
| DOCS-001 | Consolidate 54 roadmap files to 3-5 canonical docs | LOW | ready |
| DOCS-002 | Update docs/roadmaps/README.md to reflect current state | LOW | ready |
```

---

#### 4. Clarify Authoritative Roadmap

**Add to top of MASTER_ROADMAP.md:**

```markdown
> **CANONICAL SOURCE**: This is the single source of truth for all TERP development tasks.
> Other roadmap files in this directory are historical or superseded.
```

---

#### 5. Note WS-010 Partial Completion

**Change:**
```markdown
| WS-010 | Photography Module | ✅ COMPLETE |
```

**To:**
```markdown
| WS-010 | Photography Module (Component) | ✅ COMPLETE |
```

With note: "Component built. Integration tracked in WS-010A."

---

### Items Requiring Human Decision

| # | Question | Options | Impact |
|---|----------|---------|--------|
| 1 | Should Work Surfaces be deployed with current P0 blockers? | A) Fix blockers first B) Deploy with known issues | HIGH - User experience |
| 2 | Should 54 roadmap files be archived? | A) Keep all B) Archive pre-Jan-2026 files | LOW - Documentation hygiene |
| 3 | Is MVP actually 72% or 100% complete? | A) Count only "status: COMPLETE" B) Count shipped features | MEDIUM - Planning accuracy |
| 4 | Should deprecated vendor router be removed or maintained? | A) Remove Q1 2026 B) Maintain longer | MEDIUM - Migration effort |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Roadmap items analyzed | 288+ |
| Items ALIGNED | ~250 |
| Items AMBIGUOUS | 8 |
| Items MISALIGNED | 2 |
| Items ZOMBIE | 4 |
| Items MISSING | 2 |
| Conflicts identified | 5 |
| Conflicts resolved | 2 |
| Conflicts unresolved | 3 |
| P0 blockers identified | 8 |
| Do-not-build items | 9 |

---

## Appendix: Evidence File Index

| File | Purpose | Lines Referenced |
|------|---------|------------------|
| `docs/roadmaps/MASTER_ROADMAP.md` | Primary roadmap | Throughout |
| `docs/reports/INCOMPLETE_FEATURES_AUDIT_JAN_2026.md` | Git-based audit | Lines 1-676 |
| `docs/reference/FLOW_GUIDE.md` | User flow docs | Lines 1-1303 |
| `docs/qa/QA_PLAYBOOK.md` | QA testing guide | Lines 1-258 |
| `docs/auth/QA_AUTH.md` | QA auth layer docs | Lines 1-316 |
| `client/src/config/navigation.ts` | Sidebar config | Lines 1-230 |
| `.kiro/steering/00-core-identity.md` | Agent identity | Lines 1-296 |
| `.kiro/steering/07-deprecated-systems.md` | Deprecation registry | Lines 1-297 |
| `.kiro/steering/10-mvp-initiative.md` | MVP guidance | Lines 1-93 |
| `docs/roadmaps/README.md` | Roadmap index | Lines 1-377 |
| `docs/roadmaps/INCOMPLETE_FEATURES_TASKS_2026-01-20.md` | New task backlog | Lines 1-300+ |

---

*This audit was generated without making any code or behavior changes. All findings are based on documented evidence with file paths and line numbers cited.*
