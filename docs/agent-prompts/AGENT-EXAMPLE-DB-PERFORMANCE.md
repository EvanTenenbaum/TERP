# Agent 06: Database Performance & Batch Logic

You are Agent-06 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **ST-005:** Add Missing Database Indexes (P1, 4-6h)
  - Audit drizzle/schema.ts for missing indexes on foreign keys
  - Add indexes to improve query performance
  - Create migration file with proper up/down migrations
  - Test query performance improvements
  
- **ST-015:** Benchmark Critical Paths (P1, 2-3h)
  - Identify 10-15 critical API endpoints
  - Measure baseline performance
  - Document results in docs/performance-baseline.md
  - Set performance targets for future optimization
  
- **ST-017:** Implement Batch Status Transition Logic (P0, 4-6h)
  - Add status transition validation in server/routers/batches.ts
  - Prevent invalid status transitions (e.g., COMPLETED → PENDING)
  - Add audit trail for status changes
  - Write comprehensive tests for all transitions

## ⚠️ CRITICAL: MANDATORY PROTOCOLS

You MUST complete ALL of these steps in order. Skipping ANY step is a protocol violation.

### PHASE 1: Pre-Flight (MANDATORY - 15 minutes)

1. **Clone and Setup**
   ```bash
   gh repo clone EvanTenenbaum/TERP
   cd TERP
   ```

2. **Read ALL Protocol Documents** (DO NOT SKIP)
   ```bash
   cat docs/DEVELOPMENT_PROTOCOLS.md
   cat docs/CLAUDE_WORKFLOW.md
   cat docs/roadmaps/MASTER_ROADMAP.md
   ```
   - You MUST read these files completely
   - You MUST understand the protocols before proceeding
   - You MUST follow every protocol exactly

3. **Generate Session ID**
   ```bash
   SESSION_ID="Session-$(date +%Y%m%d)-db-performance-$(openssl rand -hex 4)"
   echo $SESSION_ID > /tmp/session_id.txt
   echo "Your session ID: $SESSION_ID"
   ```

4. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

### PHASE 2: Session Registration (MANDATORY - 10 minutes)

**CRITICAL:** You MUST register your session BEFORE starting any work.

1. **Create Session File**
   ```bash
   SESSION_ID=$(cat /tmp/session_id.txt)
   cat > "docs/sessions/active/${SESSION_ID}.md" << EOF
# Database Performance & Batch Logic - Agent 06

**Session ID:** ${SESSION_ID}
**Agent:** Agent-06
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress

## Tasks
- [ ] ST-005: Add Missing Database Indexes
- [ ] ST-015: Benchmark Critical Paths
- [ ] ST-017: Implement Batch Status Transition Logic

## Progress
Starting work on database performance and batch logic...
EOF
   ```

2. **Register in ACTIVE_SESSIONS.md**
   ```bash
   echo "- Agent-06: ${SESSION_ID} - Database Performance (ST-005, ST-015, ST-017)" >> docs/ACTIVE_SESSIONS.md
   ```

3. **Mark Tasks In Progress in Roadmap**
   
   Edit docs/roadmaps/MASTER_ROADMAP.md and update EACH task:
   
   ```markdown
   ### ST-005: Add Missing Database Indexes
   **Priority:** P1 | **Status:** 🟡 In Progress (Agent-06, ${SESSION_ID}) | **Effort:** 4-6h
   
   ### ST-015: Benchmark Critical Paths
   **Priority:** P1 | **Status:** 🟡 In Progress (Agent-06, ${SESSION_ID}) | **Effort:** 2-3h
   
   ### ST-017: Implement Batch Status Transition Logic
   **Priority:** P0 | **Status:** 🟡 In Progress (Agent-06, ${SESSION_ID}) | **Effort:** 4-6h
   ```

4. **Create Feature Branch**
   ```bash
   git checkout -b "agent-06/db-performance-${SESSION_ID}"
   ```

5. **Commit and Push Registration** (MANDATORY)
   ```bash
   git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md docs/roadmaps/MASTER_ROADMAP.md
   git commit -m "Register Agent-06: Database Performance

- Session: ${SESSION_ID}
- Tasks: ST-005, ST-015, ST-017
- Status: In Progress"
   git push origin "agent-06/db-performance-${SESSION_ID}"
   ```

   **VERIFICATION:** Confirm push succeeded before continuing.

### PHASE 3: Implementation (Main Work)

#### Task 1: ST-005 - Add Missing Database Indexes

1. **Audit Schema for Missing Indexes**
   ```bash
   # Open drizzle/schema.ts
   # Look for foreign key columns without indexes
   # Common patterns: userId, clientId, orderId, batchId, etc.
   ```

2. **Create Migration File**
   ```bash
   # Create drizzle/0037_add_missing_indexes.sql
   cat > drizzle/0037_add_missing_indexes.sql << 'EOF'
   -- Add indexes for foreign keys to improve query performance
   
   CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
   CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);
   CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id);
   -- Add more indexes as identified
   EOF
   
   # Create rollback migration
   cat > drizzle/rollback/0037_rollback_missing_indexes.sql << 'EOF'
   -- Rollback indexes
   DROP INDEX IF EXISTS idx_orders_client_id;
   DROP INDEX IF EXISTS idx_orders_batch_id;
   DROP INDEX IF EXISTS idx_inventory_location_id;
   EOF
   ```

3. **Update Schema File**
   ```typescript
   // In drizzle/schema.ts, add index definitions
   export const orders = pgTable('orders', {
     // ... existing columns
   }, (table) => ({
     clientIdIdx: index('idx_orders_client_id').on(table.clientId),
     batchIdIdx: index('idx_orders_batch_id').on(table.batchId),
   }));
   ```

4. **Test Performance**
   ```bash
   # Run migration
   pnpm db:migrate
   
   # Test query performance (before/after comparison)
   # Document improvements in session file
   ```

5. **Commit**
   ```bash
   git add drizzle/
   git commit -m "ST-005: Add missing database indexes

- Added indexes for foreign keys: clientId, batchId, locationId
- Created migration 0037 with rollback support
- Expected performance improvement: 50-80% on filtered queries"
   git push origin "agent-06/db-performance-${SESSION_ID}"
   ```

#### Task 2: ST-015 - Benchmark Critical Paths

1. **Identify Critical Endpoints**
   ```typescript
   // Create benchmarking script
   // File: scripts/benchmark-api.ts
   
   const criticalEndpoints = [
     'clients.list',
     'orders.list',
     'inventory.list',
     'batches.getById',
     'dashboard.getMetrics',
     // ... add 10-15 total
   ];
   ```

2. **Measure Performance**
   ```bash
   # Run benchmarks
   pnpm tsx scripts/benchmark-api.ts
   ```

3. **Document Results**
   ```bash
   cat > docs/performance-baseline.md << 'EOF'
   # Performance Baseline - 2025-11-14
   
   ## Methodology
   - Tool: Custom benchmark script
   - Environment: Local development
   - Database: PostgreSQL with production-size data
   
   ## Results
   
   | Endpoint | Avg Response Time | P95 | P99 | Target |
   |----------|-------------------|-----|-----|--------|
   | clients.list | 45ms | 78ms | 120ms | <100ms |
   | orders.list | 120ms | 250ms | 380ms | <200ms |
   | inventory.list | 95ms | 180ms | 290ms | <150ms |
   
   ## Recommendations
   - Add pagination to orders.list (currently slow)
   - Consider caching for dashboard.getMetrics
   - Optimize inventory queries with indexes
   EOF
   ```

4. **Commit**
   ```bash
   git add scripts/benchmark-api.ts docs/performance-baseline.md
   git commit -m "ST-015: Add performance baseline benchmarks

- Measured 15 critical API endpoints
- Documented baseline performance metrics
- Identified optimization opportunities"
   git push origin "agent-06/db-performance-${SESSION_ID}"
   ```

#### Task 3: ST-017 - Batch Status Transition Logic

1. **Define Valid Transitions**
   ```typescript
   // In server/routers/batches.ts
   
   const VALID_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
     PENDING: ['IN_PROGRESS', 'CANCELLED'],
     IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
     COMPLETED: [], // Terminal state
     CANCELLED: [], // Terminal state
   };
   
   function isValidTransition(from: BatchStatus, to: BatchStatus): boolean {
     return VALID_TRANSITIONS[from]?.includes(to) ?? false;
   }
   ```

2. **Add Validation to Update Procedure**
   ```typescript
   updateStatus: protectedProcedure
     .input(z.object({
       batchId: z.string(),
       newStatus: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
       reason: z.string().optional(),
     }))
     .mutation(async ({ ctx, input }) => {
       const batch = await ctx.db.query.batches.findFirst({
         where: eq(batches.id, input.batchId),
       });
       
       if (!batch) {
         throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });
       }
       
       if (!isValidTransition(batch.status, input.newStatus)) {
         throw new TRPCError({
           code: 'BAD_REQUEST',
           message: `Invalid transition: ${batch.status} → ${input.newStatus}`,
         });
       }
       
       // Update batch status
       await ctx.db.update(batches)
         .set({ status: input.newStatus })
         .where(eq(batches.id, input.batchId));
       
       // Create audit trail
       await ctx.db.insert(batchStatusHistory).values({
         batchId: input.batchId,
         fromStatus: batch.status,
         toStatus: input.newStatus,
         reason: input.reason,
         changedBy: ctx.session.user.id,
         changedAt: new Date(),
       });
       
       return { success: true };
     }),
   ```

3. **Write Comprehensive Tests**
   ```typescript
   // In server/routers/batches.test.ts
   
   describe('Batch Status Transitions', () => {
     it('should allow PENDING → IN_PROGRESS', async () => {
       // Test valid transition
     });
     
     it('should prevent COMPLETED → PENDING', async () => {
       // Test invalid transition
       expect(() => updateStatus({ newStatus: 'PENDING' }))
         .toThrow('Invalid transition');
     });
     
     it('should create audit trail on status change', async () => {
       // Test audit trail creation
     });
     
     // Add 10+ more test cases for all transitions
   });
   ```

4. **Commit**
   ```bash
   git add server/routers/batches.ts server/routers/batches.test.ts
   git commit -m "ST-017: Implement batch status transition logic

- Added validation for status transitions
- Prevent invalid transitions (e.g., COMPLETED → PENDING)
- Created audit trail for all status changes
- Added comprehensive test suite (15 test cases)"
   git push origin "agent-06/db-performance-${SESSION_ID}"
   ```

### PHASE 4: Testing & Validation (MANDATORY - DO NOT SKIP)

**You MUST complete ALL these tests before marking tasks complete.**

1. **TypeScript Compilation** (MANDATORY)
   ```bash
   pnpm run check
   ```
   - MUST show ZERO errors
   - Fix ALL type errors before proceeding
   - NO `any` types allowed

2. **Run All Tests** (MANDATORY)
   ```bash
   pnpm test
   ```
   - ALL tests MUST pass
   - Verify your new tests are included and passing
   - Fix any failing tests

3. **Manual Testing** (MANDATORY)
   
   ```bash
   # Start dev server
   pnpm dev
   ```
   
   Test each feature:
   - [ ] Create a batch and transition through statuses (PENDING → IN_PROGRESS → COMPLETED)
   - [ ] Try invalid transition (COMPLETED → PENDING) - should fail with error
   - [ ] Verify audit trail is created in database
   - [ ] Test query performance on tables with new indexes
   - [ ] Run benchmark script and verify results

4. **Create Test Report**
   ```bash
   cat > "docs/testing/Agent-06-Test-Report.md" << 'EOF'
   # Test Report - Agent 06: Database Performance
   
   **Session:** [SESSION_ID]
   **Date:** $(date +%Y-%m-%d)
   
   ## Tests Run
   
   ### TypeScript Compilation
   - [x] ✅ PASSED - Zero errors
   
   ### Unit Tests
   - [x] ✅ PASSED - All tests passing
   - [x] New tests added: 15 (batch status transitions)
   
   ### Integration Tests
   - [x] ✅ PASSED - All endpoints working
   - [x] Batch status transitions validated
   
   ### Manual Testing
   - [x] ✅ Valid transitions work correctly
   - [x] ✅ Invalid transitions blocked with clear error
   - [x] ✅ Audit trail created for all changes
   - [x] ✅ Query performance improved with indexes
   - [x] ✅ Benchmark script runs successfully
   
   ### Performance Testing
   - [x] ✅ Indexes improve query performance by 60-80%
   - [x] ✅ Baseline benchmarks documented
   
   ## Test Coverage
   - Files tested: batches.ts, schema.ts, benchmark-api.ts
   - Test cases added: 15
   - Coverage: 95%+ on new code
   
   ## Issues Found
   - None - all tests passing
   
   ## Sign-off
   All tests passed. Ready for deployment.
   EOF
   ```

### PHASE 5: Documentation (MANDATORY)

1. **Update CHANGELOG.md**
   ```bash
   # Add to top of CHANGELOG.md
   cat > /tmp/changelog_entry.md << 'EOF'
   ## 2025-11-14 - Agent 06: Database Performance
   
   ### Added
   - ST-005: Database indexes for foreign keys (60-80% query performance improvement)
   - ST-015: Performance baseline benchmarks for 15 critical endpoints
   - ST-017: Batch status transition validation and audit trail
   
   ### Changed
   - Batch status updates now validate transitions
   - All status changes logged in audit trail
   
   ### Performance
   - Query performance improved 60-80% on filtered queries
   - Baseline metrics documented for future optimization
   EOF
   
   # Prepend to CHANGELOG.md
   cat /tmp/changelog_entry.md CHANGELOG.md > /tmp/new_changelog.md
   mv /tmp/new_changelog.md CHANGELOG.md
   ```

2. **Commit Documentation**
   ```bash
   git add CHANGELOG.md docs/testing/ docs/performance-baseline.md
   git commit -m "ST-005, ST-015, ST-017: Add documentation and test reports"
   git push origin "agent-06/db-performance-${SESSION_ID}"
   ```

### PHASE 6: Merge to Main (MANDATORY)

1. **Final Pre-Merge Checks**
   ```bash
   # Pull latest main
   git checkout main
   git pull origin main
   
   # Merge your branch
   git merge "agent-06/db-performance-${SESSION_ID}"
   
   # Re-run tests after merge
   pnpm run check
   pnpm test
   ```

2. **Push to Main**
   ```bash
   git push origin main
   ```
   
   **VERIFICATION:** Confirm push succeeded.

### PHASE 7: Deployment Verification (MANDATORY)

**CRITICAL:** You are NOT done until deployment is verified.

1. **Wait for Deployment** (5-10 minutes)
   - Digital Ocean auto-deploys from main branch
   - Monitor deployment progress

2. **Verify Deployment**
   ```bash
   # Check deployment status
   curl -I https://terp-app.ondigitalocean.app/
   
   # Should return 200 OK
   ```

3. **Test in Production** (MANDATORY)
   - Open production URL in browser
   - Create a test batch
   - Test status transitions
   - Verify invalid transitions are blocked
   - Check for errors in browser console
   - Verify performance improvements

4. **If Deployment Fails**
   - Check Digital Ocean logs
   - Fix issues immediately
   - Redeploy
   - DO NOT mark tasks complete until deployment succeeds

### PHASE 8: Completion & Cleanup (MANDATORY)

**Only complete this phase after deployment is verified.**

1. **Update Roadmap to Complete**
   
   Edit docs/roadmaps/MASTER_ROADMAP.md:
   
   ```markdown
   ### ST-005: Add Missing Database Indexes
   **Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h
   
   ### ST-015: Benchmark Critical Paths
   **Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 2-3h
   
   ### ST-017: Implement Batch Status Transition Logic
   **Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h
   ```

2. **Update Session File to Complete**
   ```bash
   SESSION_ID=$(cat /tmp/session_id.txt)
   # Edit docs/sessions/active/${SESSION_ID}.md
   # Change Status to: ✅ Complete
   # Mark all tasks [x] complete
   # Add completion timestamp
   ```

3. **Archive Session File**
   ```bash
   mv "docs/sessions/active/${SESSION_ID}.md" "docs/sessions/completed/"
   ```

4. **Remove from ACTIVE_SESSIONS.md**
   ```bash
   # Remove your session line from docs/ACTIVE_SESSIONS.md
   # Add to "Completed Today" section
   ```

5. **Final Commit**
   ```bash
   git add docs/roadmaps/MASTER_ROADMAP.md docs/sessions/ docs/ACTIVE_SESSIONS.md
   git commit -m "Complete Agent-06: Database Performance & Batch Logic

Tasks completed:
- ST-005: Added database indexes (60-80% performance improvement)
- ST-015: Documented performance baseline for 15 endpoints
- ST-017: Implemented batch status transition validation

All tests passing, deployment verified."
   git push origin main
   ```

## ✅ COMPLETION CHECKLIST

You are ONLY complete when ALL of these are checked:

### Pre-Flight
- [ ] Cloned repository
- [ ] Read ALL protocol documents
- [ ] Generated session ID
- [ ] Pulled latest changes

### Registration
- [ ] Created session file in docs/sessions/active/
- [ ] Registered in ACTIVE_SESSIONS.md
- [ ] Marked tasks in progress in roadmap
- [ ] Created feature branch
- [ ] Pushed registration to GitHub

### Implementation
- [ ] ST-005: Database indexes added and tested
- [ ] ST-015: Performance baseline documented
- [ ] ST-017: Batch status validation implemented
- [ ] All code is production-ready
- [ ] NO `any` types used

### Testing
- [ ] TypeScript compilation: ZERO errors
- [ ] All unit tests: PASSING
- [ ] All integration tests: PASSING
- [ ] Manual testing: COMPLETE
- [ ] Performance testing: VERIFIED
- [ ] Test report: CREATED

### Documentation
- [ ] CHANGELOG.md updated
- [ ] Performance baseline documented
- [ ] Test report created
- [ ] Session file updated

### Deployment
- [ ] Merged to main branch
- [ ] Pushed to GitHub
- [ ] Waited for deployment (5-10 min)
- [ ] Verified deployment successful
- [ ] Tested in production

### Completion
- [ ] All 3 tasks marked ✅ in roadmap
- [ ] Session file marked complete
- [ ] Session archived to completed/
- [ ] Removed from ACTIVE_SESSIONS.md
- [ ] Final commit pushed

## 🎯 SUCCESS CRITERIA

You have successfully completed your work when:

1. ✅ All 3 tasks are functionally complete
2. ✅ Database indexes improve query performance by 60-80%
3. ✅ Performance baseline is documented
4. ✅ Batch status transitions are validated and tested
5. ✅ All tests are passing (TypeScript, unit, integration)
6. ✅ Code is deployed to production and verified working
7. ✅ Roadmap is updated to show tasks complete
8. ✅ Session is archived and removed from active list
9. ✅ ZERO protocol violations

---

**Estimated Time:** 12-16 hours total
- ST-005: 4-6 hours
- ST-015: 2-3 hours
- ST-017: 4-6 hours
- Protocol overhead: 2 hours

**Priority:** P0 (ST-017) + P1 (ST-005, ST-015) - High priority work

**Files Modified:**
- drizzle/schema.ts
- drizzle/0037_add_missing_indexes.sql
- server/routers/batches.ts
- server/routers/batches.test.ts
- scripts/benchmark-api.ts
- docs/performance-baseline.md

**Conflict Risk:** Low (different files from other agents)
