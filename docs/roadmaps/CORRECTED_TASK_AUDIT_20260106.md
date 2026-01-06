# Corrected Task Audit - January 6, 2026

**Purpose**: Double-check roadmap against actual committed code to identify documentation drift and missed implementation requirements.

---

## Critical Findings

### 🔴 DOCUMENTATION DRIFT: "404 Bugs" Are Actually Implemented!

The QA backlog lists QA-001 through QA-004 as "404 errors" but **all these modules exist and are routed**:

| QA Task | Module        | Actual Status      | Evidence                                      |
| ------- | ------------- | ------------------ | --------------------------------------------- |
| QA-001  | Todo Lists    | ✅ **IMPLEMENTED** | Routes at `/todo`, `/todos`, `/todos/:listId` |
| QA-002  | Accounting    | ✅ **IMPLEMENTED** | Full module with 10+ pages at `/accounting/*` |
| QA-003  | COGS Settings | ✅ **IMPLEMENTED** | Route at `/settings/cogs`                     |
| QA-004  | Analytics     | ✅ **IMPLEMENTED** | Route at `/analytics`                         |

**Files Verified**:

- `client/src/pages/TodoListsPage.tsx` (3,522 bytes)
- `client/src/pages/TodoListDetailPage.tsx` (8,624 bytes)
- `client/src/pages/accounting/*.tsx` (10+ files)
- `client/src/pages/CogsSettingsPage.tsx` (1,994 bytes)
- `client/src/pages/AnalyticsPage.tsx` (11,873 bytes)

**Server Routers**:

- `server/routers/todoLists.ts` (5,446 bytes)
- `server/routers/todoTasks.ts` (10,646 bytes)
- `server/routers/accounting.ts` (39,865 bytes)
- `server/routers/cogs.ts` (12,924 bytes)
- `server/routers/analytics.ts` (16,509 bytes)

**Action Required**: Update QA_TASKS_BACKLOG.md to mark QA-001 through QA-004 as COMPLETE or investigate why they return 404 in production (likely database/auth issue, not missing routes).

---

## 🟡 Missed Implementation Requirements

### 1. AG-Grid Enterprise License Key

**Issue**: AG-Grid Enterprise is used but license key not documented in `.env.example`

**Evidence**:

```typescript
// client/src/components/spreadsheet/InventoryGrid.tsx:20-23
import { LicenseManager } from "ag-grid-enterprise";
LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE_KEY || "");
```

**Action Required**:

1. Add `VITE_AG_GRID_LICENSE_KEY=` to `.env.example`
2. Obtain AG-Grid Enterprise license or use Community edition

---

### 2. Sentry Environment Variables (NEW)

**Added in PR #151** - Requires setup:

```bash
# .env.example additions
VITE_SENTRY_DSN=          # Client-side DSN
SENTRY_ORG=               # For source map upload
SENTRY_PROJECT=           # For source map upload
SENTRY_AUTH_TOKEN=        # For source map upload (CI/CD only)
```

**Status**: Added to `.env.example` ✅ but needs actual values configured in production.

---

### 3. Feature Flag: Spreadsheet View (DISABLED BY DEFAULT)

**Issue**: Spreadsheet View feature is implemented but **disabled by default**

**Evidence**:

```typescript
// server/services/seedFeatureFlags.ts
{
  key: "spreadsheet-view",
  name: "Spreadsheet View",
  systemEnabled: true,
  defaultEnabled: false,  // <-- DISABLED
}
```

**Action Required**: After Wave 5 QA passes, enable `spreadsheet-view` flag in production via Settings > Feature Flags.

---

### 4. Pending Migrations

**24 migration files** exist in `drizzle/migrations/`. Most recent:

- `0024_calendar_foundation.sql` - Multi-calendar architecture (CAL-001, CAL-002)

**Action Required**: Verify all migrations have been applied to production database.

---

## 🟢 Correctly Documented as Complete

| Task                       | Status      | Verification                                               |
| -------------------------- | ----------- | ---------------------------------------------------------- |
| ST-008 (Sentry)            | ✅ Complete | `sentry.client.config.ts`, `sentry.server.config.ts` exist |
| Memory Optimization        | ✅ Complete | PR #136 merged, Dockerfile updated                         |
| Spreadsheet View Phase 1   | ✅ Complete | `InventoryGrid.tsx`, `ClientGrid.tsx` exist                |
| Color Coding (TERP-SS-006) | ✅ Complete | PR #147 merged                                             |
| Row Grouping (TERP-SS-008) | ✅ Complete | PR #148 merged                                             |

---

## 🔵 Correctly Documented as NOT Complete

| Task                        | Status         | Verification                                     |
| --------------------------- | -------------- | ------------------------------------------------ |
| ST-009 (Datadog)            | ❌ Not Started | No Datadog references in codebase                |
| ST-010 (Redis)              | ❌ Blocked     | Only comments reference Redis, no implementation |
| REL-002 (Automated Backups) | ❌ Not Started | Only manual backup scripts exist                 |

---

## Recent Commits Review (Last 7 Days)

### Key Commits Requiring Action

| Commit     | Description            | Action Required                       |
| ---------- | ---------------------- | ------------------------------------- |
| `7fc0461e` | Memory optimization    | ✅ Merged - Dockerfile updated        |
| `ce923b2c` | Sentry integration     | ⚠️ Configure Sentry DSN in production |
| `a03f638e` | Post-Wave 5 audit      | Documentation only                    |
| `ae430c2a` | Intake/Pick-Pack grids | ⚠️ Enable feature flag after QA       |

### Dependencies Added

| Package               | Version | Notes                    |
| --------------------- | ------- | ------------------------ |
| `ag-grid-enterprise`  | 35      | **Requires license key** |
| `@sentry/vite-plugin` | ^4.6.1  | For source map upload    |

---

## Corrected Task Counts

### Previous Audit (Incorrect)

- Critical 404 Bugs: 5 tasks
- Total Remaining: 80+ tasks

### Corrected Audit

- Critical 404 Bugs: **0 tasks** (all implemented, need investigation if still failing)
- QA-005 (Data Access): **1 task** (may explain "No data found" issues)
- Total Remaining: **~75 tasks**

---

## Updated Priority Tiers

### Tier 0: Investigate Production Issues (1-2 days)

| Task     | Description                             | Hours |
| -------- | --------------------------------------- | ----- |
| QA-005   | Investigate systemic data access issues | 4-8h  |
| PROD-001 | Verify all migrations applied           | 2-4h  |
| PROD-002 | Configure Sentry DSN                    | 1-2h  |
| PROD-003 | Add AG-Grid license key                 | 0.5h  |

### Tier 1: Enable New Features (1 day)

| Task   | Description                          | Hours |
| ------ | ------------------------------------ | ----- |
| FF-001 | Enable spreadsheet-view feature flag | 0.5h  |
| FF-002 | Seed default feature flags           | 0.5h  |

### Tier 2-5: (Same as previous audit, minus the "404 bugs")

---

## Recommended Immediate Actions

1. **Investigate QA-005** - The "No data found" issue is likely the root cause of perceived 404s
2. **Apply all migrations** - Run `drizzle-kit push` or apply migration files
3. **Configure Sentry** - Set `VITE_SENTRY_DSN` in production
4. **Add AG-Grid license** - Set `VITE_AG_GRID_LICENSE_KEY` or switch to Community
5. **Enable feature flags** - Run "Seed Defaults" in Settings > Feature Flags
6. **Update QA_TASKS_BACKLOG.md** - Mark QA-001 through QA-004 as complete

---

## Files to Update

1. `.env.example` - Add `VITE_AG_GRID_LICENSE_KEY`
2. `docs/roadmaps/QA_TASKS_BACKLOG.md` - Mark QA-001-004 as complete
3. `docs/roadmaps/MASTER_ROADMAP.md` - Update status of implemented features
