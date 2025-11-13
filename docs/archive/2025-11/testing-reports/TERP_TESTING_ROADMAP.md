# TERP Testing Implementation Roadmap

**8-Week Sprint to Full Testing Coverage**

---

## Week 1: Foundation Setup

### Monday-Tuesday: Test Data Infrastructure

**Owner**: Backend Developer  
**Deliverables**:

- [ ] Refactor `scripts/seed-realistic-main.ts` to accept scenario parameter
- [ ] Create scenario configs: `light`, `full`, `edge-cases`, `chaos`
- [ ] Test database reset with all scenarios
- [ ] Update documentation

**Validation**:

```bash
pnpm test:env:up
pnpm db:reset:test light    # Should complete in <30s
pnpm db:reset:test full     # Should complete in <2min
pnpm test:env:down
```

### Wednesday-Thursday: Integration Test Setup

**Owner**: Backend Developer  
**Deliverables**:

- [ ] Verify `vitest.config.integration.ts` works
- [ ] Test global setup/teardown lifecycle
- [ ] Write first integration test (`orders.test.ts`)
- [ ] Add `test:integration` script to package.json

**Validation**:

```bash
pnpm test:integration  # Should run 1 test successfully
```

### Friday: Week 1 Review

- [ ] Demo test environment to team
- [ ] Document any blockers
- [ ] Plan Week 2 priorities

---

## Week 2-3: Backend Integration Tests

### Week 2: Critical Business Logic

**Monday**: Orders Router

- [ ] `orders.create` - Happy path
- [ ] `orders.create` - Insufficient inventory
- [ ] `orders.update` - Status transitions
- [ ] `orders.list` - Filtering and pagination

**Tuesday**: Invoices Router

- [ ] `invoices.generate` - From order
- [ ] `invoices.calculateARBuckets` - Aging logic
- [ ] `invoices.markPaid` - Status update
- [ ] `invoices.list` - Overdue filtering

**Wednesday**: Clients Router

- [ ] `clients.create` - Whale vs regular
- [ ] `clients.update` - Type changes
- [ ] `clients.getRevenue` - Aggregation logic
- [ ] `clients.delete` - Cascade handling

**Thursday**: Inventory Router

- [ ] `lots.create` - Vendor assignment
- [ ] `batches.create` - Consignment vs COD
- [ ] `batches.updateQuantity` - Inventory tracking
- [ ] `batches.getAvailable` - Stock queries

**Friday**: Week 2 Review

- [ ] Code coverage report (target: 60%+)
- [ ] Identify gaps in test coverage
- [ ] Refactor common test utilities

### Week 3: Supporting Services & Edge Cases

**Monday-Tuesday**: Auth & Permissions

- [ ] Authentication flows (sign in, sign out, session)
- [ ] Role-based access control
- [ ] Permission checks on sensitive operations

**Wednesday**: Business Calculations

- [ ] Margin calculations
- [ ] AR aging bucket logic
- [ ] Revenue aggregations

**Thursday**: Edge Cases

- [ ] Concurrent order creation (race conditions)
- [ ] Negative inventory prevention
- [ ] Date boundary testing (AR aging transitions)

**Friday**: Week 3 Review

- [ ] Final code coverage report (target: 80%+)
- [ ] Integration test suite runs in <3 minutes
- [ ] Add integration tests to PR workflow

---

## Week 4-5: Frontend E2E Tests

### Week 4: Core User Flows

**Monday**: E2E Setup & Authentication

- [ ] Verify Playwright configuration
- [ ] Write authentication tests (sign in, sign out)
- [ ] Set up accessibility utility
- [ ] First visual snapshot test

**Tuesday**: Navigation & Dashboard

- [ ] Test all routes are accessible
- [ ] Dashboard metrics display correctly
- [ ] Quick actions work
- [ ] Accessibility check on dashboard

**Wednesday**: Client Management

- [ ] Create whale client flow
- [ ] Create regular client flow
- [ ] Edit client details
- [ ] Search and filter clients

**Thursday**: Order Creation

- [ ] Multi-item order creation
- [ ] Inventory availability check
- [ ] Order summary calculation
- [ ] Visual snapshot of order form

**Friday**: Week 4 Review

- [ ] 5-7 E2E tests passing
- [ ] Zero accessibility violations
- [ ] E2E tests run in <3 minutes locally

### Week 5: Complex Flows & Visual Testing

**Monday**: Invoice Viewing

- [ ] Invoice generation from order
- [ ] PDF export functionality
- [ ] AR aging display
- [ ] Visual snapshot of invoice

**Tuesday**: Inventory Search

- [ ] Search by strain
- [ ] Filter by availability
- [ ] Batch detail view
- [ ] Consignment indicator

**Wednesday**: Batch Operations

- [ ] Bulk order updates
- [ ] Multi-select functionality
- [ ] Confirmation dialogs

**Thursday**: Visual Regression Suite

- [ ] Snapshot all key pages (8-10 states)
- [ ] Test responsive layouts
- [ ] Dark mode (if applicable)

**Friday**: Week 5 Review

- [ ] 10-15 E2E tests complete
- [ ] Visual regression baseline established
- [ ] Add E2E tests to merge workflow

---

## Week 6-7: Contract & Mutation Testing

### Week 6: Contract Testing

**Monday-Tuesday**: Pact Setup

- [ ] Install Pact dependencies
- [ ] Set up Pact Broker (Docker or Pactflow free tier)
- [ ] Configure consumer and provider tests

**Wednesday**: Critical Contracts

- [ ] `orders.create` contract
- [ ] `invoices.list` contract
- [ ] `clients.getById` contract

**Thursday**: Provider Verification

- [ ] Backend verifies all contracts
- [ ] Add contract tests to CI
- [ ] Document contract versioning

**Friday**: Week 6 Review

- [ ] 5-7 contracts defined and verified
- [ ] Contract tests in PR workflow
- [ ] Team trained on contract testing

### Week 7: Mutation Testing

**Monday-Tuesday**: Stryker Setup

- [ ] Install Stryker dependencies
- [ ] Configure `stryker.conf.js`
- [ ] Run first mutation test (small scope)

**Wednesday**: Mutation Analysis

- [ ] Analyze mutation report
- [ ] Identify weak tests
- [ ] Improve tests for high-risk areas

**Thursday**: Nightly Automation

- [ ] Create `nightly.yml` workflow
- [ ] Schedule mutation tests
- [ ] Set up report notifications

**Friday**: Week 7 Review

- [ ] Mutation score: 70%+ on critical logic
- [ ] Nightly runs automated
- [ ] Document mutation testing process

---

## Week 8: Performance & CI/CD Polish

### Week 8: Performance Testing & Final Automation

**Monday**: Performance Budgets

- [ ] Define budgets for 10 key pages
- [ ] Write performance tests in Playwright
- [ ] Baseline current performance

**Tuesday**: Performance Optimization

- [ ] Identify slow pages
- [ ] Optimize if needed
- [ ] Re-run performance suite

**Wednesday**: CI/CD Refinement

- [ ] Optimize PR workflow (<5 min)
- [ ] Optimize merge workflow (<15 min)
- [ ] Test deployment automation

**Thursday**: Documentation & Training

- [ ] Update README with testing guide
- [ ] Create testing best practices doc
- [ ] Team training session

**Friday**: Week 8 Review & Celebration

- [ ] Final metrics review
- [ ] Demo full testing suite to stakeholders
- [ ] Celebrate completion! 🎉

---

## Success Criteria (End of Week 8)

### Coverage

- ✅ 80%+ backend code coverage
- ✅ 10-15 E2E tests covering critical flows
- ✅ 5-7 API contracts defined

### Quality

- ✅ <5% defect escape rate
- ✅ <2% test flakiness
- ✅ Zero accessibility violations

### Automation

- ✅ PR checks: <5 minutes
- ✅ Merge checks: <15 minutes
- ✅ Nightly quality reports

### Velocity

- ✅ Multiple deployments per day
- ✅ Confident refactoring
- ✅ Fast feedback loops

---

## Weekly Standup Template

**What was completed last week?**

- List deliverables

**What's planned for this week?**

- List priorities

**Any blockers?**

- Technical issues
- Resource constraints
- Unclear requirements

**Metrics update**

- Code coverage: X%
- Tests passing: X/Y
- CI/CD status: Green/Red

---

## Contingency Plans

### If Week 2-3 falls behind

- Reduce integration test scope to critical paths only
- Extend to Week 4 if needed
- Maintain 70%+ coverage minimum

### If E2E tests are too flaky

- Increase timeouts
- Add explicit waits
- Reduce scope to 5-7 most critical flows

### If mutation testing is too slow

- Reduce scope to critical business logic only
- Run weekly instead of nightly
- Accept 60% mutation score

---

## Post-Implementation: Ongoing Maintenance

### Daily

- Monitor CI/CD pipeline health
- Fix failing tests immediately

### Weekly

- Review mutation test reports
- Update visual snapshots if UI changes
- Refactor flaky tests

### Monthly

- Review code coverage trends
- Update performance budgets
- Team retrospective on testing practices

---

**End of Roadmap**
