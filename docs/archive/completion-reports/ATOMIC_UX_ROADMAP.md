# Atomic UX Roadmap - Live Shopping & Related Features

**Created:** December 24, 2025  
**Status:** Redhat QA Complete - Ready for Execution  
**Scope:** UX improvements for Live Shopping and related features

---

## Executive Summary

This roadmap addresses critical UX gaps and TypeScript errors blocking the Live Shopping feature from being fully functional. The focus is on fixing blocking issues first, then enhancing UX consistency.

---

## Current State Analysis

### Blocking Issues (Must Fix)

1. **14 TypeScript Errors in Live Shopping Backend** - Prevents clean builds
2. **Missing Session Console Page** - Staff cannot manage active sessions
3. **Missing VIP Portal Live Shopping View** - Clients cannot join sessions

### UX Gaps Identified

1. Live Shopping page created but missing session detail/console view
2. No visual feedback for real-time session state changes
3. Tab overflow issues on mobile (documented in UI_QA_AUDIT_REPORT.md)
4. Inconsistent loading states across pages

---

## Atomic Tasks

### Phase 1: Fix TypeScript Errors (Blocking)

| Task ID | Description                           | File                                                     | Priority |
| ------- | ------------------------------------- | -------------------------------------------------------- | -------- |
| TS-001  | Fix `emitSessionStatus` → `emitEvent` | `server/routers/liveShopping.ts`                         | P0       |
| TS-002  | Fix `unitCost` → `unitCogs`           | `server/routers/liveShopping.ts`                         | P0       |
| TS-003  | Fix null check for `clientId`         | `server/routers/liveShopping.ts`                         | P0       |
| TS-004  | Fix `basePrice` property access       | `server/routers/vipPortalLiveShopping.ts`                | P0       |
| TS-005  | Fix argument type mismatch            | `server/routers/vipPortalLiveShopping.ts`                | P0       |
| TS-006  | Fix import paths                      | `server/services/creditEngine-patch.ts`                  | P0       |
| TS-007  | Fix `creditExposure` property         | `server/services/live-shopping/sessionCreditService.ts`  | P0       |
| TS-008  | Fix order creation params             | `server/services/live-shopping/sessionOrderService.ts`   | P0       |
| TS-009  | Fix `unitCost` → `unitCogs`           | `server/services/live-shopping/sessionPricingService.ts` | P0       |

### Phase 2: Live Shopping Console UX

| Task ID | Description                                   | Component                     | Priority |
| ------- | --------------------------------------------- | ----------------------------- | -------- |
| UX-001  | Create session detail/console view            | `LiveShoppingConsolePage.tsx` | P1       |
| UX-002  | Add real-time cart display                    | Console component             | P1       |
| UX-003  | Add product search/add functionality          | Console component             | P1       |
| UX-004  | Add session status controls (Start/Pause/End) | Console component             | P1       |
| UX-005  | Add price override UI                         | Console component             | P2       |
| UX-006  | Add credit limit indicator                    | Console component             | P2       |

### Phase 3: VIP Portal Integration

| Task ID | Description                        | Component                 | Priority |
| ------- | ---------------------------------- | ------------------------- | -------- |
| VIP-001 | Add Live Shopping to VIP Dashboard | `VIPDashboard.tsx`        | P1       |
| VIP-002 | Create client session view         | `VIPLiveShoppingView.tsx` | P1       |
| VIP-003 | Add cart interaction for clients   | VIP component             | P2       |

### Phase 4: Polish & Consistency

| Task ID | Description                            | Component               | Priority |
| ------- | -------------------------------------- | ----------------------- | -------- |
| POL-001 | Add loading skeletons to Live Shopping | All Live Shopping pages | P2       |
| POL-002 | Add empty states                       | All Live Shopping pages | P2       |
| POL-003 | Mobile responsiveness audit            | All Live Shopping pages | P2       |
| POL-004 | Dark mode verification                 | All Live Shopping pages | P3       |

---

## Success Criteria

1. **Zero TypeScript errors** in Live Shopping related files
2. **Staff can create and manage sessions** via the console
3. **Clients can join sessions** via VIP Portal
4. **All pages pass mobile responsiveness** check
5. **Dark mode works** on all new components

---

## Estimated Effort

| Phase     | Tasks  | Estimated Time |
| --------- | ------ | -------------- |
| Phase 1   | 9      | 30 minutes     |
| Phase 2   | 6      | 2 hours        |
| Phase 3   | 3      | 1 hour         |
| Phase 4   | 4      | 1 hour         |
| **Total** | **22** | **~4.5 hours** |

---

## Dependencies

- Existing `liveShopping` tRPC router
- Existing `sessionEventManager` SSE infrastructure
- Existing `sessionCartService`, `sessionPricingService`, `sessionOrderService`
- shadcn/ui component library

---

## Risks & Mitigations

| Risk                            | Mitigation                                       |
| ------------------------------- | ------------------------------------------------ |
| SSE connection issues           | Use existing heartbeat mechanism                 |
| Database schema changes         | No schema changes needed - using existing tables |
| Breaking existing functionality | All changes are additive                         |

---

## Redhat QA Review - December 24, 2025

### Issues Identified in Initial Roadmap

1. **Scope Creep Risk** - Phase 2-4 are too ambitious for immediate execution
2. **Missing Prioritization** - Should focus on TypeScript fixes first to unblock deployment
3. **DigitalOcean Auth Issue** - MCP token appears expired, need alternative monitoring approach
4. **Missing Console Page Route** - LiveShoppingPage needs session detail view, not separate page

### Revised Approach

**Immediate Focus (This Session):**

1. Fix all 14 TypeScript errors (Phase 1) - BLOCKING
2. Enhance LiveShoppingPage with session detail view - HIGH VALUE
3. Commit and push to trigger deployment
4. Monitor deployment via browser (DigitalOcean dashboard)

**Deferred (Future Sessions):**

- VIP Portal integration (Phase 3)
- Polish & consistency (Phase 4)

### Redhat QA Checklist

- [ ] All TypeScript errors resolved
- [ ] LiveShoppingPage shows session details when sessionId provided
- [ ] All new components follow design system
- [ ] Mobile responsiveness verified
- [ ] Dark mode verified
- [ ] No console errors
- [ ] Commit passes lint-staged hooks
- [ ] Deployment successful on DigitalOcean
