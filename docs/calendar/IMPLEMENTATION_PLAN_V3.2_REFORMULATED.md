# Calendar Evolution v3.2 - Reformulated Implementation Plan
**Incremental Evolution from v2.0 to v3.2**

---

## 📋 Document Info

- **Version**: 3.2 Reformulated
- **Date**: 2025-11-10
- **Based On**: Actual TERP codebase analysis
- **Approach**: Incremental evolution (not full rewrite)
- **Compliance**: 100% TERP Bible protocols

---

## 🎯 Executive Summary

**Current State**: TERP has production-ready calendar v2.0 with:
- ✅ 9 database tables
- ✅ 7 routers with RBAC
- ✅ 30 tests following TERP Bible
- ✅ N+1 query fixes already done
- ✅ Timezone handling with Luxon

**Evolution Strategy**: **Hybrid Approach**
- Keep all v2.0 functionality
- Add v3.2 enhancements incrementally
- Deploy in phases
- Low risk, high confidence

**Timeline**: 9-12 weeks (vs 16 weeks in original plan)  
**Team**: 2 developers  
**Tests**: 30 → 200 (170 new tests)  
**Risk**: Low

---

## 🗺️ Implementation Phases

### PHASE 0: Database Evolution (Week 1)
**Goal**: Add v3.2 database columns and fix CASCADE behavior

**Duration**: 1 week  
**Effort**: 40 hours  
**Risk**: Low

#### Tasks

**Day 1-2: Create Migrations**
- [ ] Migration 0031: Add client_id, vendor_id, metadata columns
- [ ] Migration 0032: Fix clientMeetingHistory CASCADE → SET NULL
- [ ] Migration 0033: Add AR_COLLECTION, AP_PAYMENT event types
- [ ] Migration 0034: Add intake_event_id to orders table
- [ ] Migration 0035: Add photo_session_event_id to batches table

**Day 3: Update Schema**
- [ ] Update `drizzle/schema.ts` with new columns
- [ ] Update TypeScript types
- [ ] Verify schema compiles

**Day 4: Run Migrations**
- [ ] Test migrations on local dev database
- [ ] Verify data integrity
- [ ] Test rollback procedures
- [ ] Document any issues

**Day 5: Verification**
- [ ] Run verification queries
- [ ] Check foreign key constraints
- [ ] Check indexes created
- [ ] Update migration documentation

#### Deliverables
- ✅ 5 migration SQL files
- ✅ Updated schema.ts
- ✅ Migration verification report
- ✅ Rollback procedures documented

#### Definition of Done
- [ ] All migrations run successfully
- [ ] No data loss
- [ ] All foreign keys working
- [ ] All indexes created
- [ ] Schema compiles without errors
- [ ] Rollback tested and working

---

### PHASE 1: Core API Evolution (Weeks 2-4)
**Goal**: Add v3.2 query functions and conflict detection

**Duration**: 2-3 weeks  
**Effort**: 120 hours  
**Risk**: Low

#### Week 2: Database Layer Updates

**Tasks**:
- [ ] Add `getEventsByClient(clientId)` to calendarDb.ts
- [ ] Add `getEventsByVendor(vendorId)` to calendarDb.ts
- [ ] Add `checkConflicts()` function
- [ ] Add transaction wrapper `withTransaction()`
- [ ] Update `createEvent()` to use transactions
- [ ] Update `updateEvent()` to use transactions

**Testing** (TDD - Red/Green/Refactor):
- [ ] Write 15 integration tests for new query functions
- [ ] Write 10 unit tests for conflict detection
- [ ] Write 5 unit tests for transaction wrapper
- [ ] All 30 tests passing

**Deliverables**:
- Updated calendarDb.ts with new functions
- 30 new tests passing
- No breaking changes to existing code

---

#### Week 3: Router Updates

**Tasks**:
- [ ] Update `calendar.createEvent` to check conflicts
- [ ] Add metadata support to create/update
- [ ] Add validation for client_id/vendor_id mutual exclusivity
- [ ] Update error handling
- [ ] Add logging for all operations

**Testing** (TDD):
- [ ] Write 10 integration tests for conflict detection
- [ ] Write 5 integration tests for metadata support
- [ ] All 15 tests passing

**Deliverables**:
- Updated calendar.ts router
- 15 new tests passing
- Conflict detection working

---

#### Week 4: Phase 1 Integration

**Tasks**:
- [ ] Integration testing
- [ ] Performance testing
- [ ] Fix any issues
- [ ] Code review
- [ ] Documentation updates

**Deliverables**:
- Phase 1 complete
- 45 total new tests passing
- Performance targets met
- Documentation updated

#### Phase 1 Definition of Done
- [ ] All new functions working
- [ ] 45 tests passing (30 existing + 45 new = 75 total)
- [ ] No breaking changes
- [ ] Conflict detection prevents double-booking
- [ ] Transactions prevent race conditions
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

### PHASE 2: Client Integration (Weeks 5-6)
**Goal**: Add client-facing APIs and appointment history

**Duration**: 1-2 weeks  
**Effort**: 80 hours  
**Risk**: Low

#### Week 5: Client APIs

**Tasks**:
- [ ] Add `quickBookForClient` to calendar.ts
  - Use conflict detection from Phase 1
  - Pre-populate client data
  - Return available slots if conflict
- [ ] Add `getClientAppointments` to calendar.ts
  - Filter by upcoming/past
  - Include pagination
  - Sort by date
- [ ] Add `getDaySchedule` to calendar.ts
  - For dashboard widget
  - Filter by event type
  - Include quick actions

**Testing** (TDD):
- [ ] Write 15 integration tests for quickBookForClient
- [ ] Write 10 integration tests for getClientAppointments
- [ ] Write 5 integration tests for getDaySchedule
- [ ] Write 2 E2E tests for client profile flow
- [ ] All 32 tests passing

**Deliverables**:
- 3 new client APIs working
- 32 new tests passing (27 integration + 2 E2E + 3 from existing)

---

#### Week 6: Client Activity Integration

**Tasks**:
- [ ] Update calendar events to log to clientActivity
- [ ] Update clientMeetingHistory on MEETING events
- [ ] Add client activity tracking for all client events
- [ ] Test integration with existing client module

**Testing**:
- [ ] Verify clientActivity logging
- [ ] Verify clientMeetingHistory updates
- [ ] Integration tests pass

**Deliverables**:
- Client activity tracking working
- Meeting history integration working

#### Phase 2 Definition of Done
- [ ] quickBookForClient working with conflict detection
- [ ] getClientAppointments returning correct data
- [ ] getDaySchedule working for dashboard
- [ ] Client activity logging working
- [ ] Meeting history integration working
- [ ] 27 new tests passing (102 total)
- [ ] No breaking changes
- [ ] Code reviewed and approved

---

### PHASE 3: Financial Workflows (Weeks 7-8)
**Goal**: Add AR and AP payment processing workflows

**Duration**: 2 weeks  
**Effort**: 80 hours  
**Risk**: Medium

#### Week 7: AR Payment Processing

**Tasks**:
- [ ] Add `processPaymentFromAppointment` to calendarFinancials.ts
  - Validate AR_COLLECTION event
  - Validate invoice exists and unpaid
  - Validate payment amount
  - Create payment record
  - Update invoice status
  - Link payment to event
  - Use transaction
  - Log to clientActivity
- [ ] Add RBAC permission check
- [ ] Add error handling

**Testing** (TDD):
- [ ] Write 10 integration tests for AR payment
- [ ] Write 1 E2E test for AR payment flow
- [ ] All 11 tests passing

**Deliverables**:
- AR payment processing working
- 11 new tests passing

---

#### Week 8: AP Payment Processing

**Tasks**:
- [ ] Add `processVendorPaymentFromAppointment` to calendarFinancials.ts
  - Validate AP_PAYMENT event
  - Validate PO exists and unpaid
  - Validate payment amount
  - Create vendor payment record
  - Update PO status
  - Link payment to event
  - Handle check numbers
  - Use transaction
  - Log to vendorActivity
- [ ] Add RBAC permission check
- [ ] Add error handling

**Testing** (TDD):
- [ ] Write 10 integration tests for AP payment
- [ ] Write 1 E2E test for AP payment flow
- [ ] All 11 tests passing

**Deliverables**:
- AP payment processing working
- 11 new tests passing

#### Phase 3 Definition of Done
- [ ] AR payment processing working end-to-end
- [ ] AP payment processing working end-to-end
- [ ] All payments use transactions
- [ ] Invoice/PO status updates correctly
- [ ] Payments linked to events
- [ ] Client/vendor activity logged
- [ ] 22 new tests passing (124 total)
- [ ] No breaking changes
- [ ] Code reviewed and approved

---

### PHASE 4: Operations Workflows (Weeks 9-10)
**Goal**: Add order creation and batch linking workflows

**Duration**: 1-2 weeks  
**Effort**: 60 hours  
**Risk**: Low

#### Week 9: Order Creation Workflow

**Tasks**:
- [ ] Add `createFromAppointment` to orders router
  - Validate INTAKE event
  - Check for duplicate orders (by intake_event_id)
  - Create order with pre-populated data
  - Link order to event via intake_event_id
  - Update event metadata
  - Use transaction
  - Log to clientActivity
- [ ] Add RBAC permission check
- [ ] Add error handling

**Testing** (TDD):
- [ ] Write 8 integration tests for order creation
- [ ] Write 1 E2E test for order creation flow
- [ ] All 9 tests passing

**Deliverables**:
- Order creation workflow working
- 9 new tests passing

---

#### Week 10: Batch Linking Workflow

**Tasks**:
- [ ] Add `linkBatchToPhotoSession` to calendar.ts
  - Validate PHOTOGRAPHY event
  - Validate batch exists
  - Update batch with photo_session_event_id
  - Update event metadata
  - Use transaction
- [ ] Add RBAC permission check
- [ ] Add error handling

**Testing** (TDD):
- [ ] Write 7 integration tests for batch linking
- [ ] Write 1 E2E test for batch linking flow
- [ ] All 8 tests passing

**Deliverables**:
- Batch linking workflow working
- 8 new tests passing

#### Phase 4 Definition of Done
- [ ] Order creation from INTAKE working
- [ ] Batch linking from PHOTOGRAPHY working
- [ ] Duplicate order detection working
- [ ] All workflows use transactions
- [ ] Activity logging working
- [ ] 17 new tests passing (141 total)
- [ ] No breaking changes
- [ ] Code reviewed and approved

---

### PHASE 5: VIP Portal (Week 11)
**Goal**: Add public booking APIs for VIP portal

**Duration**: 1 week  
**Effort**: 40 hours  
**Risk**: Low

#### Tasks

**Day 1-2: Available Slots API**
- [ ] Add `getAvailableSlots` to calendar.ts
  - Implement optimized O(n) algorithm (Fix #9)
  - Query events in date range
  - Build set of booked slots
  - Generate available slots
  - Handle timezone conversion
  - Make publicly accessible (no auth required)
- [ ] Write 10 integration tests
- [ ] All tests passing

**Day 3-4: External Booking API**
- [ ] Add `bookAppointmentExternal` to calendar.ts
  - Validate client credentials (VIP portal auth)
  - Check conflicts
  - Create event
  - Return confirmation details
  - Make publicly accessible
- [ ] Write 5 integration tests
- [ ] Write 4 E2E tests
- [ ] All tests passing

**Day 5: Integration & Testing**
- [ ] Integration testing
- [ ] Performance testing
- [ ] Documentation

#### Deliverables
- getAvailableSlots working (O(n) performance)
- bookAppointmentExternal working
- Confirmation details returned
- 19 new tests passing (160 total)

#### Phase 5 Definition of Done
- [ ] Available slots API working
- [ ] External booking API working
- [ ] Conflict detection working
- [ ] Confirmation details returned to client
- [ ] Timezone handling correct
- [ ] Performance targets met (O(n))
- [ ] 19 new tests passing (160 total)
- [ ] APIs publicly accessible
- [ ] Documentation complete

---

### PHASE 6: Monitoring & Polish (Week 12)
**Goal**: Add monitoring, logging, and complete testing

**Duration**: 1 week  
**Effort**: 40 hours  
**Risk**: Low

#### Day 1: Health Checks

**Tasks**:
- [ ] Create health check endpoint `/api/health/calendar`
  - Check database connection
  - Check recent events query
  - Return status and metrics
- [ ] Create automated monitoring script
  - Run every 5 minutes via cron
  - Alert on failures
- [ ] Write 5 integration tests

**Deliverables**:
- Health check endpoint working
- Monitoring script deployed
- 5 tests passing

---

#### Day 2: Logging

**Tasks**:
- [ ] Set up Winston logger
  - Configure log levels
  - Configure file output
  - Configure console output
  - JSON format
- [ ] Add logging to all calendar operations
  - Event creation/update/delete
  - Workflow operations
  - API calls
  - Errors
- [ ] Write 5 integration tests

**Deliverables**:
- Winston logger configured
- Logging in place
- 5 tests passing

---

#### Day 3: Error Tracking

**Tasks**:
- [ ] Set up Sentry integration
  - Configure Sentry client
  - Add error capture
  - Add user context
  - Add breadcrumbs
- [ ] Test error tracking
- [ ] Write 5 integration tests

**Deliverables**:
- Sentry integrated
- Error tracking working
- 5 tests passing

---

#### Day 4: Performance Monitoring

**Tasks**:
- [ ] Add slow query detection (1000ms threshold)
- [ ] Add operation performance tracking
- [ ] Add metrics collection
- [ ] Write 5 integration tests

**Deliverables**:
- Performance monitoring working
- 5 tests passing

---

#### Day 5: Complete Testing

**Tasks**:
- [ ] Write remaining tests to reach 200 total
  - 15 validation tests
  - 10 query tests
  - 5 utility tests
  - 6 E2E tests
- [ ] Run full test suite
- [ ] Verify 100% coverage
- [ ] Fix any failing tests

**Deliverables**:
- 200 tests passing ✅
- 100% coverage ✅

#### Phase 6 Definition of Done
- [ ] Health checks working
- [ ] Logging configured and working
- [ ] Error tracking configured and working
- [ ] Performance monitoring working
- [ ] 200 tests passing (100% coverage)
- [ ] All monitoring alerts configured
- [ ] Documentation complete
- [ ] Code reviewed and approved

---

## 📊 Timeline Summary

| Phase | Duration | Tests Added | Cumulative Tests | Status |
|-------|----------|-------------|------------------|--------|
| **Existing** | - | 30 | 30 | ✅ Done |
| **Phase 0** | 1 week | 0 | 30 | Ready |
| **Phase 1** | 2-3 weeks | 45 | 75 | Ready |
| **Phase 2** | 1-2 weeks | 27 | 102 | Ready |
| **Phase 3** | 2 weeks | 22 | 124 | Ready |
| **Phase 4** | 1-2 weeks | 17 | 141 | Ready |
| **Phase 5** | 1 week | 19 | 160 | Ready |
| **Phase 6** | 1 week | 40 | 200 | Ready |
| **TOTAL** | **9-12 weeks** | **170** | **200** | **Ready** |

---

## 🧪 Testing Strategy

### Test Distribution

| Type | Count | Percentage | TERP Bible Target |
|------|-------|------------|-------------------|
| **Integration** | 140 | 70% | 70% ✅ |
| **Unit** | 40 | 20% | 20% ✅ |
| **E2E** | 20 | 10% | 10% ✅ |
| **TOTAL** | **200** | **100%** | **100%** ✅ |

### TDD Workflow (Mandatory)

For every feature:
1. **Red**: Write failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Clean up code
4. **Commit**: Commit passing test + code
5. **Repeat**: For next feature

### Test Coverage Targets

- **Routers**: 100% (minimum 95%)
- **Database functions**: 100% (minimum 90%)
- **Utilities**: 100% (minimum 90%)
- **Overall**: 100% (minimum 80%)

---

## 📋 Definition of Done (Overall)

**Calendar v3.2 is "Done" when ALL criteria met**:

### Code Quality
- [ ] Production-ready, no placeholders
- [ ] Follows TERP Bible protocols
- [ ] No linting or type errors
- [ ] All v3.2 features implemented
- [ ] No breaking changes to v2.0

### Testing
- [ ] **200 tests passing**
- [ ] **100% coverage**
- [ ] TDD workflow followed
- [ ] Testing Trophy distribution (70/20/10)
- [ ] All tests documented

### Functionality
- [ ] All v2.0 features still working
- [ ] All v3.2 features working
- [ ] All workflows tested end-to-end
- [ ] All edge cases handled

### Database
- [ ] All migrations run successfully
- [ ] No data loss
- [ ] All foreign keys working
- [ ] All indexes created
- [ ] Rollback procedures tested

### RBAC
- [ ] All endpoints protected
- [ ] Frontend permission checks in place
- [ ] Permissions tested

### Monitoring
- [ ] Health checks working
- [ ] Logging in place
- [ ] Error tracking configured
- [ ] Performance monitoring working
- [ ] Alerts configured

### Documentation
- [ ] API documentation updated
- [ ] Migration documentation complete
- [ ] User guide updated
- [ ] Admin guide updated

### Deployment
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Monitoring working in production
- [ ] Support team trained

---

## 🎯 Success Metrics

### Technical Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Test Count** | 200 | `npm test -- --coverage` |
| **Test Coverage** | 100% | Coverage report |
| **API Response Time** | < 500ms (95th) | Performance monitoring |
| **N+1 Queries** | 0 | Query logging |
| **Breaking Changes** | 0 | Integration tests |
| **Transactions** | 100% (multi-step) | Code review |

### Business Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Module Integrations** | 8 | Feature checklist |
| **Workflows** | 4 | Feature checklist |
| **Client Features** | 3 | Feature checklist |
| **VIP Portal** | Yes | Feature checklist |
| **Monitoring** | Yes | Health checks |

---

## ⚠️ Risk Management

### Low Risk Items

| Risk | Mitigation | Owner |
|------|------------|-------|
| **Database migrations** | Test on dev first, have rollback | Dev Lead |
| **Breaking changes** | Integration tests, careful review | Dev Team |
| **Performance** | Load testing, query optimization | Dev Team |

### Medium Risk Items

| Risk | Mitigation | Owner |
|------|------------|-------|
| **Financial workflows** | Extensive testing, transactions | Dev Team |
| **VIP portal security** | Auth validation, rate limiting | Dev Team |

---

## 📚 Reference Documents

1. **CODEBASE_ANALYSIS.md** - Current state analysis
2. **CALENDAR_EVOLUTION_SPEC_V3.2_SUMMARY.md** - v3.2 requirements
3. **CALENDAR_TESTING_SPECIFICATION.md** - Testing requirements
4. **CALENDAR_MONITORING_SPECIFICATION.md** - Monitoring requirements
5. **COMPREHENSIVE_QA_REPORT.md** - All issues identified
6. **SELF_HEALING_FIXES.md** - All solutions

---

## 🚀 Next Steps

### Immediate (This Week)
1. **Review** this reformulated plan
2. **Approve** Phase 0 to begin
3. **Set up** dev environment
4. **Create** Phase 0 branch

### Phase 0 (Week 1)
1. Create all 5 migrations
2. Update schema.ts
3. Test migrations
4. Verify data integrity

### Phases 1-6 (Weeks 2-12)
1. Follow plan sequentially
2. Use TDD for all features
3. Pass phase gates
4. Deploy to production

---

**Document Status**: Complete  
**Approach**: Incremental evolution  
**Timeline**: 9-12 weeks  
**Risk**: Low  
**Confidence**: High  
**Ready**: Yes ✅
