# VIP Client Portal - Comprehensive Implementation Prompt

## CONTEXT

You are implementing the VIP Client Portal for the TERP hemp flower wholesale brokerage ERP system. This is a client-facing web application that allows VIP clients to view their account information, manage marketplace listings, and track their credit status.

## OBJECTIVE

Build a fully functional, production-ready VIP Client Portal that is seamlessly integrated into the existing TERP codebase, following all TERP development protocols and achieving ATOMIC COMPLETE status.

## SPECIFICATIONS

All specifications are located in `/home/ubuntu/TERP/docs/specs/`:
- `VIP_CLIENT_PORTAL_FEATURE_SPEC_V3.md` - Complete feature specification
- `VIP_CLIENT_PORTAL_FEATURE_LIST_V3.md` - Numbered list of all 80 features
- `VIP_PORTAL_ADMIN_CONFIGURATION.md` - Admin configuration system specification
- `AUDIO_FEEDBACK_SUMMARY.md` - Key user requirements and decisions
- `mockups/` - High-resolution UI mockups for visual reference

## DEVELOPMENT PROTOCOLS

### 1. ATOMIC COMPLETE DEVELOPMENT
Before any development action, execute the ATOMIC COMPLETE CHECK:
- **Context Anchoring:** What existing systems are already working?
- **Enhancement vs. Duplication:** Build on existing infrastructure, never create parallel systems
- **Agreed Scope:** Only implement features from the agreed specifications
- **Quality Standard:** No feature is "done" until it achieves 0.8+ across all four pillars:
  - Functional Completeness
  - Integration Coherence
  - Production Readiness
  - Deployment Verification

### 2. INTEGRATION OVER DUPLICATION
- Extend existing TERP structures (database schema, tRPC routers, UI components)
- Use existing authentication system (`server/_core/simpleAuth.ts`)
- Follow existing patterns in `server/routers/` for API endpoints
- Use existing UI component library (shadcn/ui, Tailwind CSS)
- Leverage existing database tables where possible

### 3. COHESIVE SYSTEM
- Ensure every feature is fully integrated into the live TERP build
- Test workflows end-to-end after implementing changes
- Maintain consistency with existing TERP UI/UX patterns
- Remove or deprecate any outdated logic

## IMPLEMENTATION PHASES

### PHASE 1: Database Schema & Migrations

**Tasks:**
1. Review existing schema in `drizzle/schema.ts`
2. Create new tables:
   - `vip_portal_configurations` (for admin control of client portals)
   - `vip_portal_sessions` (if needed beyond existing auth)
3. Add fields to existing `clients` table:
   - `vip_portal_enabled` (boolean)
   - `vip_portal_last_login` (timestamp)
4. Ensure `client_needs` and `vendor_supply` tables support all required fields
5. Create migration files in `drizzle/migrations/`
6. Test migrations locally

**Verification:**
- All tables created successfully
- Foreign key relationships intact
- Migrations are reversible
- No data loss on existing tables

### PHASE 2: tRPC API Endpoints

**Tasks:**
1. Create new router: `server/routers/vipPortal.ts`
2. Implement client-facing endpoints:
   - `vipPortal.dashboard.getKPIs`
   - `vipPortal.transactions.list`
   - `vipPortal.ar.list`
   - `vipPortal.ap.list`
   - `vipPortal.credit.getSummary`
   - `vipPortal.tier.getStatus`
   - `vipPortal.marketplace.listNeeds`
   - `vipPortal.marketplace.listSupply`
   - `vipPortal.marketplace.createNeed`
   - `vipPortal.marketplace.createSupply`
   - `vipPortal.marketplace.updateNeed`
   - `vipPortal.marketplace.updateSupply`
   - `vipPortal.marketplace.cancelNeed`
   - `vipPortal.marketplace.cancelSupply`
3. Create admin router: `server/routers/vipPortalAdmin.ts`
4. Implement admin endpoints:
   - `vipPortalAdmin.config.get`
   - `vipPortalAdmin.config.update`
   - `vipPortalAdmin.config.applyTemplate`
   - `vipPortalAdmin.config.copyConfig`
   - `vipPortalAdmin.clients.getLastLogin`
5. Add routers to `server/routers/index.ts`
6. Implement proper authentication checks (clients can only access their own data)

**Verification:**
- All endpoints return correct data
- Authentication works properly
- Error handling is robust
- API follows existing TERP patterns

### PHASE 3: Admin Configuration Interface

**Tasks:**
1. Create admin page: `client/pages/VIPPortalConfig.tsx`
2. Implement module-level toggles for all 8 modules
3. Implement feature-level controls (expandable sections)
4. Create configuration templates (Full Access, Financial Only, Marketplace Only, Basic)
5. Add "Preview Portal" functionality
6. Add "Apply Template" dropdown
7. Add "Copy Configuration" feature
8. Integrate into existing client management UI
9. Add navigation link in admin sidebar

**Verification:**
- Configuration saves correctly to database
- Changes reflect immediately in client portal
- Templates apply correctly
- UI matches mockup design
- Responsive on mobile

### PHASE 4: Client-Facing Portal Pages

**Tasks:**
1. Create portal layout: `client/pages/portal/PortalLayout.tsx`
2. Create authentication pages:
   - `client/pages/portal/Login.tsx` (with SSO options)
   - `client/pages/portal/ForgotPassword.tsx`
3. Create dashboard: `client/pages/portal/Dashboard.tsx`
4. Create financial pages:
   - `client/pages/portal/AccountsReceivable.tsx`
   - `client/pages/portal/AccountsPayable.tsx`
   - `client/pages/portal/TransactionHistory.tsx`
5. Create VIP tier page: `client/pages/portal/VIPTier.tsx`
6. Create credit center: `client/pages/portal/CreditCenter.tsx`
7. Create marketplace pages:
   - `client/pages/portal/marketplace/Needs.tsx`
   - `client/pages/portal/marketplace/Supply.tsx`
   - `client/pages/portal/marketplace/CreateNeed.tsx`
   - `client/pages/portal/marketplace/CreateSupply.tsx`
8. Implement conditional rendering based on portal configuration
9. Ensure all pages are mobile-responsive

**Verification:**
- All pages render correctly
- Data loads from API endpoints
- Conditional visibility works based on config
- UI matches mockups
- Mobile-responsive design works

### PHASE 5: Authentication & Routing

**Tasks:**
1. Set up portal-specific authentication flow
2. Implement SSO with Google and Microsoft
3. Create protected routes for portal pages
4. Add session management (30-day expiration)
5. Implement password reset flow
6. Add logout functionality
7. Configure routing in `client/App.tsx` or routing config
8. Ensure portal is isolated from main TERP admin interface

**Verification:**
- Login works with password
- SSO works with Google and Microsoft
- Session persists correctly
- Password reset emails send
- Protected routes redirect to login
- Logout clears session

### PHASE 6: Integration & Polish

**Tasks:**
1. Ensure all components use existing TERP UI patterns
2. Add loading states and error handling
3. Implement proper form validation
4. Add success/error notifications
5. Optimize database queries
6. Add proper TypeScript types throughout
7. Ensure accessibility (ARIA labels, keyboard navigation)
8. Test all user flows end-to-end

**Verification:**
- No TypeScript errors
- All forms validate properly
- Loading states show during API calls
- Error messages are clear and helpful
- Performance is acceptable

## QUALITY ASSURANCE PROTOCOL

### Skeptical QA (Phase 8)
Conduct a brutal, skeptical review of the implementation:
1. Test every feature from the feature list
2. Try to break the system with edge cases
3. Verify data integrity
4. Check for security vulnerabilities
5. Test on different browsers and devices
6. Document all issues found

### Self-Heal (Phase 9)
Fix all issues identified in QA:
1. Prioritize critical bugs first
2. Fix each issue completely
3. Add tests to prevent regression
4. Re-verify after each fix

### Final QA (Phase 10)
Re-test the entire system:
1. Verify all original issues are resolved
2. Ensure no new issues were introduced
3. Confirm ATOMIC COMPLETE status (0.8+ on all pillars)
4. Get user approval before deployment

## DEPLOYMENT

1. Run production build: `npm run build`
2. Run migrations on production database
3. Deploy to production environment
4. Verify deployment with smoke tests
5. Monitor for errors in first 24 hours

## SUCCESS CRITERIA

The implementation is complete when:
- ✅ All 80 features from the feature list are implemented
- ✅ Admin can configure each client's portal
- ✅ Clients can log in and access their portal
- ✅ All data displays correctly based on configuration
- ✅ Marketplace functionality works (create, edit, cancel listings)
- ✅ System passes skeptical QA
- ✅ All issues from QA are resolved
- ✅ ATOMIC COMPLETE verification passes (0.8+ on all pillars)
- ✅ Deployed to production and verified working

## NOTES

- Follow existing TERP code style and conventions
- Use existing components and utilities where possible
- Document any new patterns or decisions
- Keep the codebase clean and maintainable
- Prioritize user experience and performance
- Ensure security best practices throughout

## BEGIN IMPLEMENTATION

Start with ATOMIC COMPLETE CHECK, then proceed through phases 1-11 systematically.
