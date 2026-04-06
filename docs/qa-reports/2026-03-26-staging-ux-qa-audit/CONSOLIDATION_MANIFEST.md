# Remediation Train Consolidation Manifest

**Generated:** 2026-03-26
**Authority:** Supervisor session (sole Linear structure authority)
**Scope:** 110 open issues (TER-850 through TER-959)

---

## 1. INTAKE SUMMARY

- **Session start:** 2026-03-26 ~23:18 UTC
- **Cutoff (3h prior):** ~20:18 UTC
- **Team/Project:** Terpcorp / TERP - Golden Flows Beta
- **Total open issues:** 110
- **Wave A (TER-850–868):** 19 issues, created 21:36–21:40 — older granular set
- **Wave B (TER-869–887):** 19 issues, created 22:34–22:36 — parent+child structure
- **Wave C (TER-888–898):** 11 issues, created 22:37 — Phase 2 unique flows
- **Wave D (TER-899–959):** 61 issues, created 23:06–23:07 — redundant granular tickets

---

## 2. CANONICAL BACKBONE

**TER-869** remains the master train parent. Its 18 children (TER-870–887) are the canonical work items, organized by surface. Each child already maps to specific BUG-XXX findings from the QA audit.

### Canonical children (existing, kept as-is):

| ID | Surface | BUG-IDs Covered | Priority |
|----|---------|-----------------|----------|
| TER-870 | Sales Quotes | BUG-006–011 | P1 |
| TER-871 | Sales Orders | BUG-012–015, 017–020 | P1 |
| TER-872 | Purchase Orders | BUG-021–025 | P2 |
| TER-873 | Inventory Receiving | BUG-026–033 | P1 |
| TER-874 | Inventory Intake | BUG-034–044, 106 | P1 |
| TER-875 | Shipping | BUG-045–051 | P1 |
| TER-876 | Accounting Invoices | BUG-052–060 | P0 |
| TER-877 | Accounting Payments | BUG-061–062 | P2 |
| TER-878 | Client Credit | BUG-063–065 | P2 |
| TER-879 | Relationships | BUG-066–078 | P1 |
| TER-880 | Settings Users | BUG-079–082, 110 | P0 |
| TER-881 | Feature Flags | BUG-083–085 | P2 |
| TER-882 | Analytics | BUG-086–089, 112 | P2 |
| TER-883 | Calendar | BUG-090–094, 097–100, 107–109, 113 | P1 |
| TER-884 | Calendar Filters | BUG-095–096 | P2 |
| TER-885 | Mobile Navigation | BUG-102–105, 111 | P1 |
| TER-886 | Data Pollution (cross-cut) | BUG-005, 016, 045, 060, 066, 081, 088, 091, 097 | P1 |
| TER-887 | Dev Metadata (cross-cut) | BUG-003, 004, 021, 052, 068, 073, 083, 105 | P2 |

### New canonical children to add under TER-869 (from Wave C):

| ID | Surface | Source | Why canonical |
|----|---------|--------|---------------|
| TER-888 | D&S Modals | B-85,86,87 | Unique flow — D&S completely broken, not covered by existing children |
| TER-889 | Receiving Row Click | B-79,80 | Unique AG Grid wiring gap — receiving is non-functional |
| TER-890 | Sales Catalogue Routing | B-91,92 | Unique flow — catalogue tab completely broken |
| TER-891 | My Account | B-100 | Unique flow — account page inaccessible |
| TER-892 | Invoice Filters | B-105,115 | Partial overlap with TER-876 but distinct filter+modal issues |
| TER-893 | Bills Drawer | B-116 | Unique — bills drawer completely empty |
| TER-894 | Notifications Filters | B-98,99 | Unique — notification sub-filters non-functional |
| TER-895 | Samples Row Click | B-102 | Unique — samples detail inaccessible |
| TER-896 | Add Supplier Form | B-110 | Unique — supplier creation broken |
| TER-897 | New Sales Order Tab | B-114 | Unique — misleading tab label |
| TER-898 | Calendar Create Event | B-101 | Unique — event creation non-functional |

### New standalone canonical issues to promote:

| ID | Surface | Why standalone |
|----|---------|---------------|
| TER-899 | Global: HTTP 400 | Not covered by any child — fires on every page load |
| TER-900 | Global: HTTP 500s | Not covered by any child — 80+ 500 errors per session |
| TER-902 | Global: No 404 page | Not covered — distinct from TER-859 route redirects |
| TER-905 | Dashboard KPIs | Not covered — contradictory financial stats |
| TER-925 | PO Negative Totals | CRITICAL — all PO totals display negative, not covered by TER-872 |
| TER-959 | COGS Visibility | Security — cost data exposed to all users |

---

## 3. DUPLICATE-RESOLUTION MAP

### Classification key:
- **EXACT_DUP**: Same issue, same scope, same fix → close newer, reference canonical
- **DUP_WITH_NUANCE**: Same issue but adds unique detail → transfer nuance, then close
- **PARTIAL_OVERLAP**: Related but different scope → relate, keep both
- **SUBSUMED**: Granular sub-case fully covered by broader canonical → close, reference
- **BLOCKER**: Older issue that blocks a newer one → keep, mark as blocker
- **DISTINCT**: No meaningful overlap → keep

### Wave A (TER-850–868) → Canonical mapping:

| Source | Classification | Canonical | Unique nuance to transfer |
|--------|---------------|-----------|--------------------------|
| TER-850 | EXACT_DUP | TER-903 | None — identical global search issue |
| TER-851 | PARTIAL_OVERLAP | TER-862, TER-894 | Deep link 404 routing — unique repro path |
| TER-852 | DUP_WITH_NUANCE | TER-871 | **Full page hang on row click (60s timeout)** — critical perf detail |
| TER-853 | DUP_WITH_NUANCE | TER-871 | Single-click behavior: must select cell, not open drawer |
| TER-854 | DUP_WITH_NUANCE | TER-874 | Unreadable column headers, specific CSS detail |
| TER-855 | EXACT_DUP | TER-870 | None — identical to BUG-007 (New Quote creates Order) |
| TER-856 | DUP_WITH_NUANCE | TER-876 | Receive Payment multi-step modal blocked at step 1 |
| TER-857 | EXACT_DUP | TER-956 | None — also overlaps TER-880 |
| TER-858 | PARTIAL_OVERLAP | TER-876 | GL investigation scope broader than BUG-058 |
| TER-859 | DISTINCT | (promote) | Specific route redirects /suppliers /payments /admin |
| TER-860 | DUP_WITH_NUANCE | TER-887 | More detailed dev-strip implementation plan |
| TER-861 | DUP_WITH_NUANCE | TER-872 | Missing detail page + silent validation details |
| TER-862 | DUP_WITH_NUANCE | TER-894 | Bell sync + client name display details |
| TER-863 | DUP_WITH_NUANCE | TER-879 | Wrong drawer + supplier row click details |
| TER-864 | PARTIAL_OVERLAP | TER-876 | Tab overflow + ARIA roles — partially distinct |
| TER-865 | SUBSUMED | TER-887 | Navigation naming cleanup — covered by dev metadata cross-cut |
| TER-866 | DUP_WITH_NUANCE | TER-885 | Mobile dev text walls specific detail |
| TER-867 | PARTIAL_OVERLAP | TER-879, TER-883 | D&S + Returns + Settings — spans multiple surfaces |
| TER-868 | SUBSUMED | TER-886, TER-887 | Cosmetic polish items covered by cross-cuts |

### Wave D (TER-899–959) → Canonical mapping:

| Source | Classification | Canonical | Unique nuance |
|--------|---------------|-----------|---------------|
| TER-899 | DISTINCT | (promote) | HTTP 400 on every page — not covered anywhere |
| TER-900 | DISTINCT | (promote) | 80+ HTTP 500s — infrastructure-level |
| TER-901 | SUBSUMED | TER-887 | Build ID = BUG-004 |
| TER-902 | DISTINCT | (promote) | No 404 page — distinct from route redirects |
| TER-903 | EXACT_DUP of TER-850 | (promote as canonical) | Global search broken |
| TER-904 | SUBSUMED | TER-862/TER-894 | Bell badge count = notification system |
| TER-905 | DISTINCT | (promote) | Dashboard KPI contradictions |
| TER-906 | SUBSUMED | TER-887 | Dev banner = BUG-003 |
| TER-907 | SUBSUMED | TER-887 | Feature-flag badge = dev metadata |
| TER-908 | SUBSUMED | TER-887 | Debug string = dev metadata |
| TER-909 | SUBSUMED | TER-887 | Release gate text = dev metadata |
| TER-910 | EXACT_DUP | TER-897 | New Sales Order tab |
| TER-911 | DUP_WITH_NUANCE | TER-871 | Row click populating order lines — specific AG Grid detail |
| TER-912 | SUBSUMED | TER-871 | Workflow buttons = order state inconsistency |
| TER-913 | SUBSUMED | TER-886 | Numeric IDs in names = data pollution |
| TER-914 | SUBSUMED | TER-887 | SELL/WORKSPACE breadcrumb = dev metadata |
| TER-915 | SUBSUMED | TER-887 | Flow description = dev metadata |
| TER-916 | PARTIAL_OVERLAP | TER-871 | Credit limit UX — adds actionable-next-step angle |
| TER-917 | SUBSUMED | TER-871 | 0% gross margin = BUG-018 |
| TER-918 | SUBSUMED | TER-887 | Classic Sales CTA = dev jargon |
| TER-919 | SUBSUMED | TER-887 | GL/Audit field names = dev jargon |
| TER-920 | PARTIAL_OVERLAP | TER-870 | Valid Until blank — adds default value angle |
| TER-921 | PARTIAL_OVERLAP | TER-879 | User #2 display — adds actor-name-resolution detail |
| TER-922 | SUBSUMED | TER-879 | Return reason breakdown |
| TER-923 | SUBSUMED | TER-879 | Process Return button state |
| TER-924 | PARTIAL_OVERLAP | TER-872 | ARIA roles — distinct accessibility angle |
| TER-925 | DISTINCT | (promote) | **CRITICAL** — All PO totals negative |
| TER-926 | SUBSUMED | TER-872 | Expected date blank = BUG-022 |
| TER-927 | SUBSUMED | TER-872 | 0 selected state |
| TER-928 | SUBSUMED | TER-872 | PO row click = BUG-023 |
| TER-929 | SUBSUMED | TER-872 | Placeholder text |
| TER-930 | SUBSUMED | TER-872 | Activity log disabled |
| TER-931 | PARTIAL_OVERLAP | TER-874 | $0 COGS — unique cost-data angle |
| TER-932 | SUBSUMED | TER-886 | Test names in shipping = data pollution |
| TER-933 | SUBSUMED | TER-875 | 0 bags = BUG-051 area |
| TER-934 | SUBSUMED | TER-873 | 0 selected in receiving |
| TER-935 | SUBSUMED | TER-874 | Save View disabled — low sev |
| TER-936 | SUBSUMED | TER-887 | Internal tab labels = dev metadata |
| TER-937 | SUBSUMED | TER-876 | Overdue tab navigates wrong |
| TER-938 | SUBSUMED | TER-885 | Swipe hint on desktop = mobile cross-cut |
| TER-939 | SUBSUMED | TER-876 | Count in tab labels |
| TER-940 | PARTIAL_OVERLAP | TER-876 | Inconsistent invoice format — unique numbering angle |
| TER-941 | DISTINCT | (defer) | Fiscal periods not configured — data/config, not code |
| TER-942 | DISTINCT | (defer) | Bank transactions empty — data/config |
| TER-943 | DISTINCT | (defer) | Expenses empty — data/config |
| TER-944 | PARTIAL_OVERLAP | TER-876 | Overdue alerting — feature request beyond bug fix |
| TER-945 | DISTINCT | (defer) | Future-dated payment — data integrity |
| TER-946 | SUBSUMED | TER-883 | Lorem-ipsum events = calendar data quality |
| TER-947 | SUBSUMED | TER-886 | QA Chain Events = data pollution |
| TER-948 | DUP_WITH_NUANCE | TER-894 | Notifications stuck loading — adds loading state detail |
| TER-949 | SUBSUMED | TER-886 | Junk client = data pollution |
| TER-950 | SUBSUMED | TER-886 | Debug client = data pollution |
| TER-951 | SUBSUMED | TER-879 | LTV $0 = BUG-072 area |
| TER-952 | PARTIAL_OVERLAP | TER-888 | Matchmaking 0 needs — downstream of D&S broken |
| TER-953 | SUBSUMED | TER-882 | Analytics inventory blank = BUG-089 |
| TER-954 | SUBSUMED | TER-886 | Test client in analytics = data pollution |
| TER-955 | DUP_WITH_NUANCE | TER-880 | Password length — adds NIST standard detail |
| TER-956 | EXACT_DUP | TER-857 → TER-880 | User Roles loading |
| TER-957 | DUP_WITH_NUANCE | TER-881 | Dev panel access — adds 57-flag count, destructive button detail |
| TER-958 | SUBSUMED | TER-886 | E2E products = data pollution |
| TER-959 | DISTINCT | (promote) | COGS visibility = security configuration |

---

## 4. CANONICAL ISSUE MANIFEST (post-consolidation)

### Tier 1: Canonical work items under TER-869

**Serial Foundations (must complete before parallel lanes):**

| # | Canonical ID | Title | Serial reason | Priority |
|---|-------------|-------|---------------|----------|
| S1 | TER-899 | HTTP 400 on every page load | Affects all surfaces | P2 |
| S2 | TER-900 | 80+ HTTP 500 server errors | Affects all surfaces, root-cause req | P2 |
| S3 | TER-887 | Remove dev metadata from operator UIs | Touches 6+ shared components | P2 |
| S4 | TER-880 | Fix settings users + security | Auth/RBAC, security-critical | P0 |
| S5 | TER-886 | Clean staging data pollution | Cross-cutting, all surfaces | P1 |
| S6 | TER-859 | Fix dead routes | Shared routing | P1 |
| S7 | TER-902 | Add 404 page | Shared routing | P3 |
| S8 | TER-903 | Fix global search | Shared component | P2 |

**Parallel Lane A — Sales + D&S + Shipping:**

| # | Canonical ID | Title | Priority |
|---|-------------|-------|----------|
| A1 | TER-870 | Sales Quotes — routing + conversion | P1 |
| A2 | TER-871 | Sales Orders — state + invoicing + financial | P1 |
| A3 | TER-875 | Shipping — queue clarity + drawer bugs | P1 |
| A4 | TER-888 | D&S — Add Need/Supply modals | P1 |
| A5 | TER-890 | Sales Catalogue — routing + combobox | P2 |
| A6 | TER-897 | New Sales Order tab label | P4 |
| A7 | TER-905 | Dashboard KPI contradictions | P3 |

**Parallel Lane B — Inventory + Accounting + Calendar + Analytics:**

| # | Canonical ID | Title | Priority |
|---|-------------|-------|----------|
| B1 | TER-876 | Invoice data integrity + GL contradictions | P0 |
| B2 | TER-872 | Purchase Orders — context + receiving handoff | P2 |
| B3 | TER-925 | PO negative totals | P1 (CRITICAL) |
| B4 | TER-873 | Receiving — review/grading/evidence | P1 |
| B5 | TER-874 | Intake — defaults/validation/selection | P1 |
| B6 | TER-889 | Receiving — row click opens detail form | P2 |
| B7 | TER-892 | Invoice filters + Create Invoice modal | P2 |
| B8 | TER-893 | Bills drawer — populate with content | P3 |
| B9 | TER-883 | Calendar — data quality + permissions + event form | P1 |
| B10 | TER-884 | Calendar filters — terminology + state | P2 |
| B11 | TER-898 | Calendar Create Event — form renders empty | P4 |
| B12 | TER-882 | Analytics — terminology + errors + reporting | P2 |

**Cross-cutting (after serial foundations, can parallel with Lane A/B):**

| # | Canonical ID | Title | Priority |
|---|-------------|-------|----------|
| X1 | TER-879 | Relationships — lists + detail + money history | P1 |
| X2 | TER-896 | Add Supplier form broken | P3 |
| X3 | TER-878 | Client credit adjustment UX | P2 |
| X4 | TER-877 | Payments references + list semantics | P2 |
| X5 | TER-885 | Mobile navigation + responsive | P1 |
| X6 | TER-881 | Feature flags admin surface | P2 |
| X7 | TER-891 | My Account inaccessible | P2 |
| X8 | TER-894 | Notifications filters + Mark All Read | P3 |
| X9 | TER-895 | Samples row click | P3 |
| X10 | TER-959 | COGS visibility — security config | P3 |

**Deferred (data/config, not code bugs):**

| ID | Title | Why deferred |
|----|-------|-------------|
| TER-941 | No fiscal periods | Config setup, not code bug |
| TER-942 | Bank Transactions empty | No data recorded, not code bug |
| TER-943 | Expenses empty | No data recorded, not code bug |
| TER-945 | Future-dated payment | Data integrity — manual correction |

---

## 5. EXTERNAL BLOCKERS

| Blocker | Blocks | Why |
|---------|--------|-----|
| HTTP 500 root cause (TER-900) | ALL surfaces | 80+ 500 errors may indicate broken tRPC endpoints that affect every fix |
| Dev build mode investigation | TER-887 | If staging runs `pnpm dev`, import.meta.env.DEV gates won't hide content |
| TER-880 (security) | TER-881, TER-959 | Settings/Users must be stable before feature flag + COGS changes |
| TER-886 (data cleanup) | TER-882 (analytics), TER-883 (calendar) | Test data removal required before analytics/calendar can show correct data |

---

## 6. ISSUES TO CLOSE AS DUPLICATES

### Exact duplicates (close immediately):
- TER-850 → duplicate of TER-903 (global search)
- TER-855 → duplicate of TER-870 (quotes)
- TER-857 → duplicate of TER-880 (user roles loading)
- TER-910 → duplicate of TER-897 (new sales order tab)
- TER-956 → duplicate of TER-880 (user roles loading)

### Subsumed by canonical (close with reference after nuance check):
- TER-901 → subsumed by TER-887
- TER-906, TER-907, TER-908, TER-909 → subsumed by TER-887
- TER-912, TER-917 → subsumed by TER-871
- TER-913, TER-932, TER-949, TER-950, TER-954, TER-958 → subsumed by TER-886
- TER-914, TER-915, TER-918, TER-919, TER-936 → subsumed by TER-887
- TER-922, TER-923 → subsumed by TER-879
- TER-926, TER-927, TER-928, TER-929, TER-930 → subsumed by TER-872
- TER-933 → subsumed by TER-875
- TER-934 → subsumed by TER-873
- TER-935 → subsumed by TER-874
- TER-937, TER-939 → subsumed by TER-876
- TER-938 → subsumed by TER-885
- TER-946 → subsumed by TER-883
- TER-947 → subsumed by TER-886
- TER-951 → subsumed by TER-879
- TER-953 → subsumed by TER-882

### DUP_WITH_NUANCE (transfer detail, then close):
- TER-852, TER-853 → to TER-871 (page hang + single-click details)
- TER-854 → to TER-874 (unreadable headers detail)
- TER-856 → to TER-876 (multi-step modal detail)
- TER-860 → to TER-887 (detailed dev-strip plan)
- TER-861 → to TER-872 (detail page + validation details)
- TER-862 → to TER-894 (bell sync details)
- TER-863 → to TER-879 (drawer + supplier click details)
- TER-866 → to TER-885 (mobile dev text wall detail)
- TER-911 → to TER-871 (AG Grid order lines detail)
- TER-948 → to TER-894 (loading state detail)
- TER-955 → to TER-880 (NIST password standard detail)
- TER-957 → to TER-881 (57-flag count detail)

### PARTIAL_OVERLAP (relate, keep open):
- TER-851 → relates to TER-894 (notification deep links distinct from filters)
- TER-858 → relates to TER-876 (GL investigation broader scope)
- TER-864 → relates to TER-876 (ARIA roles distinct)
- TER-867 → relates to TER-879, TER-883 (spans surfaces)
- TER-916 → relates to TER-871 (credit limit UX distinct angle)
- TER-920 → relates to TER-870 (default value angle distinct)
- TER-921 → relates to TER-879 (actor name resolution distinct)
- TER-924 → relates to TER-872 (accessibility distinct)
- TER-931 → relates to TER-874 ($0 COGS distinct cost angle)
- TER-940 → relates to TER-876 (invoice numbering distinct)
- TER-944 → relates to TER-876 (alerting workflow = feature request)
- TER-952 → relates to TER-888 (downstream of D&S broken)

---

## 7. SERIAL FOUNDATIONS LIST

Execute in this order before any parallel work:

1. **S1: TER-900** — Investigate and fix HTTP 500 root causes (may unblock many surfaces)
2. **S2: TER-899** — Fix HTTP 400 on every page load
3. **S3: TER-887 + TER-860** — Strip dev metadata from all surfaces (touches 6+ shared files)
4. **S4: TER-880 + TER-955** — Fix settings/users security (auth/RBAC)
5. **S5: TER-886** — Clean staging data pollution (cross-cutting)
6. **S6: TER-859** — Add dead route redirects
7. **S7: TER-903 / TER-850** — Fix global search
8. **S8: TER-902** — Add 404 catch-all page

---

## 8. LANE A ASSIGNMENT — Sales + D&S + Shipping

**Execution order:**
1. TER-871 — Sales Orders (absorbs TER-852, 853, 911, 912, 917)
2. TER-870 — Sales Quotes (absorbs TER-855)
3. TER-875 — Shipping
4. TER-888 — D&S modals
5. TER-890 — Sales Catalogue routing
6. TER-897 — New Sales Order tab label (absorbs TER-910)
7. TER-905 — Dashboard KPIs

**Owned paths:** `client/src/components/spreadsheet-native/Orders*.tsx`, `client/src/components/spreadsheet-native/Quotes*.tsx`, `client/src/components/spreadsheet-native/Fulfillment*.tsx`, `client/src/pages/MatchmakingServicePage.tsx`, `client/src/pages/SalesWorkspace.tsx`

**Forbidden paths:** ALL inventory, accounting, calendar, settings, analytics components

**Escalate to supervisor:**
- Any change to shared routing (App.tsx)
- Any change to tRPC schema definitions
- Any server router change that affects another lane's surface

---

## 9. LANE B ASSIGNMENT — Inventory + Accounting + Calendar + Analytics

**Execution order:**
1. TER-876 — Invoice data integrity (absorbs TER-856, 858, 937, 939, 940)
2. TER-925 — PO negative totals (CRITICAL)
3. TER-872 — Purchase Orders (absorbs TER-861, 926-930)
4. TER-873 — Receiving (absorbs TER-934)
5. TER-874 — Intake (absorbs TER-854, 931, 935)
6. TER-889 — Receiving row click
7. TER-892 — Invoice filters + Create Invoice modal
8. TER-893 — Bills drawer
9. TER-883 — Calendar
10. TER-884 — Calendar filters
11. TER-898 — Calendar Create Event
12. TER-882 — Analytics

**Owned paths:** `client/src/components/spreadsheet-native/Invoices*.tsx`, `client/src/components/spreadsheet-native/PurchaseOrders*.tsx`, `client/src/components/spreadsheet-native/Inventory*.tsx`, `client/src/pages/AccountingWorkspace.tsx`, `client/src/pages/CalendarPage.tsx`, `client/src/pages/AnalyticsPage.tsx`, `server/routers/invoices.ts`, `server/routers/accounting.ts`

**Forbidden paths:** ALL sales, D&S, shipping, relationships components

**Escalate to supervisor:**
- Any GL-affecting mutation changes
- Any change to shared routing
- Any schema/migration changes

---

## 10. CROSS-CUTTING WORK (after serial, parallel with lanes)

Can be dispatched alongside Lane A/B but must not touch their owned files:

| Issue | Owned Paths |
|-------|-------------|
| TER-879 (Relationships) | `client/src/pages/Relationships*.tsx`, `client/src/components/client-detail/` |
| TER-896 (Add Supplier) | `client/src/components/relationships/` |
| TER-878 (Client Credit) | `client/src/pages/ClientCredit*.tsx` |
| TER-877 (Payments refs) | `client/src/components/spreadsheet-native/Payments*.tsx` |
| TER-885 (Mobile) | Shared layout files — SERIAL with dev metadata strip |
| TER-881 (Feature Flags) | `client/src/pages/Settings*.tsx` (feature flags tab only) |
| TER-891 (My Account) | `client/src/components/AppHeader.tsx` |
| TER-894 (Notifications) | `client/src/components/notifications/` |
| TER-895 (Samples) | `client/src/components/spreadsheet-native/Samples*.tsx` |
| TER-959 (COGS) | Settings/org config |

---

## 11. PROOF REQUIREMENTS PER ISSUE

Every canonical issue requires ALL of these before closeout:

1. **Implementation proof**: Code diff with `pnpm check` zero errors
2. **Wiring proof**: Component renders in correct route with correct data binding
3. **Functional proof**: The specific BUG-XXX repro steps no longer reproduce
4. **Negative-path proof**: Error states handled gracefully (not silent, not raw backend)
5. **Regression proof**: Adjacent features on same page still work
6. **Live-surface proof**: Verified on staging URL after deploy (NOT just local)

Additional per-category:
- **P0 issues** (TER-876, TER-880): Require adversarial QA review + Evan approval
- **Security issues** (TER-880, TER-959): Require rollback plan documented
- **Data integrity** (TER-876, TER-925): Require before/after data state evidence
- **Cross-cutting** (TER-886, TER-887): Require proof from 3+ affected surfaces

---

## 12. RELEASE-CLOSEOUT GATE

The train is NOT complete until:
- [ ] All serial foundations verified on staging
- [ ] All Lane A issues closed with evidence
- [ ] All Lane B issues closed with evidence
- [ ] All cross-cutting issues closed with evidence
- [ ] Combined regression pass (full E2E suite)
- [ ] No child of TER-869 remains open or partial
- [ ] No duplicate nuance was lost (check this manifest)
- [ ] No "implemented but unsurfaced" fix counted as done
- [ ] Adversarial QA review of final staging state
