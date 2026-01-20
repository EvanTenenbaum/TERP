# TERP Changelog

All notable changes to the TERP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2026-01-20] - Work Surfaces Deployment Strategy

### Added

- **Deployment Strategy v1**: Comprehensive 965-line deployment strategy for Work Surfaces rollout
- **Deployment Strategy v2**: RedHat QA-reviewed version with all P0 blockers addressed
- **QA Gate Scripts**: 6 executable verification scripts for deployment gates
  - `scripts/qa/placeholder-scan.sh` - Gate G4: Critical path placeholder detection
  - `scripts/qa/rbac-verify.sh` - Gate G5: RBAC enforcement verification
  - `scripts/qa/feature-parity.sh` - Gate G6: tRPC call comparison between old/new pages
  - `scripts/qa/invariant-checks.ts` - Gate G7: Business logic invariant validation
  - `scripts/qa/orphaned-procedures.sh` - Orphaned tRPC procedure detection
  - `scripts/qa/bulk-action-parity.sh` - Bulk action regression detection

### Documentation

- `docs/deployment/WORKSURFACES_DEPLOYMENT_STRATEGY.md` - Initial deployment strategy
- `docs/deployment/WORKSURFACES_DEPLOYMENT_STRATEGY_v2.md` - QA-reviewed strategy with fixes
- `docs/deployment/WORKSURFACES_EXECUTION_ROADMAP.md` - Strategic execution roadmap with step-by-step instructions
- `docs/specs/ui-ux-strategy/ATOMIC_ROADMAP.md` - Updated with Sprint 4-8 completion status
- `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md` - Updated with Work Surface status
- `docs/roadmaps/MASTER_ROADMAP.md` - Added DEPLOY-001..008 tasks for Work Surfaces rollout

### QA Findings (RedHat-Grade Audit)

7 P0 blockers identified and addressed:
1. Routes not wired (App.tsx has 0 WorkSurfaceGate imports)
2. Gate scripts don't exist (now created)
3. Feature parity incomplete (scripts now verify 200+ procedures)
4. USER_FLOW_MATRIX.csv integration (now parsed as truth source)
5. RBAC verification enhanced (exhaustive check, not just count)
6. Rollback plan clarified (forward-only migrations documented)
7. Invariant checks committed (runnable TypeScript, not pseudocode)

### Technical

- Progressive rollout stages defined: 0% → 10% → 50% → 100%
- Self-correction mechanisms: Auto-disable on invariant violation
- Rollback procedures: Feature flag (seconds), code (minutes), schema (forward-only)
- Observability requirements: Log fields, alert thresholds, dashboards

**Commits**: `2b2a1bd`, `c58cd14`
**Session**: `Session-20260120-WORKSURFACES-DEPLOYMENT-XpszM`

---

## [2025-12-23] - UI QA Fixes

### Fixed

- **CalendarPage Dark Mode**: Replaced hardcoded Tailwind colors with design system tokens for proper dark mode support
- **Login Component Migration**: Migrated from raw HTML inputs to shadcn/ui components with dark mode support and loading states
- **Mobile Layout Flash**: Fixed useMobile hook initial undefined state causing layout shifts during hydration
- **ClientProfile Tab Overflow**: Added horizontal scroll for tabs on mobile with clean scrollbar-hide utility
- **Mobile Responsiveness**: Improved responsive design patterns across Calendar and Login pages

### Added

- **scrollbar-hide CSS utility**: Cross-browser utility for hiding scrollbars while maintaining scroll functionality
- **Comprehensive JSDoc**: Added documentation to useMobile hook
- **Accessibility improvements**: Added ARIA labels and proper semantic markup
- **Loading states**: Added spinner animations for better UX

### Technical

- **Design System Compliance**: All UI components now use semantic design tokens
- **Component Consistency**: Login page now follows established shadcn/ui patterns
- **Performance**: Eliminated layout flash and improved mobile rendering
- **Cross-browser Support**: scrollbar-hide utility works across IE/Edge, Firefox, and Webkit browsers

### Documentation

- Added `docs/UI_QA_AUDIT_REPORT.md` - Comprehensive audit findings and fixes
- Added `docs/TECHNICAL_IMPLEMENTATION_DETAILS.md` - Detailed technical implementation
- Updated `docs/TECHNICAL_DEBT.md` - Marked UI issues as resolved

**Commit**: `9bbdcda5` - "fix(ui): QA fixes for dark mode, mobile responsiveness, and component migration"

---

## Previous Releases

_This changelog was created on 2025-12-23. Previous changes are documented in git history._
