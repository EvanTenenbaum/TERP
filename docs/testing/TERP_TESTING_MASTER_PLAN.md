# TERP Testing Master Plan: Full Coverage Initiative

**Author**: Manus AI  
**Date**: November 5, 2025  
**Status**: Ready for Implementation  
**Goal**: Achieve world-class testing coverage for TERP with robust automation, comprehensive quality gates, and continuous monitoring

---

## Executive Summary

This document provides a complete, actionable roadmap for implementing full testing coverage across the TERP system. The plan is designed to over-invest in quality and reliability while maintaining development velocity through smart automation and tooling choices.

The strategy follows a four-phase implementation approach, building from a solid foundation of test data through to advanced quality gates and production monitoring. Each phase is designed to be completed sequentially, with clear success criteria and deliverables.

**Timeline**: 8-10 weeks to full implementation  
**Investment**: $0-600/month (optional paid tools in later phases)  
**Expected Outcome**: 85%+ test coverage, <5% defect escape rate, multiple daily deployments with confidence

---

## Exhaustive Interaction Protocols

The single source of truth for all Quality Assurance (QA) testing protocols is now maintained in the `EXHAUSTIVE_INTERACTION_PROTOCOLS.md` document. This document contains the definitive list of test specifications (TS-001 to TS-15) that cover every critical interaction, edge case, and user flow in the TERP system.

**Reference**: [EXHAUSTIVE_INTERACTION_PROTOCOLS.md](./EXHAUSTIVE_INTERACTION_PROTOCOLS.md)

---

## Testing Philosophy: The Testing Trophy

We adopt the **Testing Trophy** model (not the traditional pyramid) because it better aligns with modern full-stack applications like TERP.

```
         /\
        /  \  E2E (10%)
       /----\
      /      \  Integration (50%)
     /--------\
    /          \  Unit (30%)
   /------------\
  /  Static (10%) \
 /------------------\
```

### Why the Trophy Over the Pyramid

The Testing Trophy prioritizes **integration tests** because they provide the highest return on investment for applications with complex business logic and database interactions. Unit tests are still important, but we focus them on pure business logic, not trivial getters/setters.

**Key Principle**: Write tests that give you confidence, not tests that give you coverage metrics.

---

## Phase 1: Foundation (Week 1-2)

### Goal

Establish a reproducible, isolated testing environment with realistic test data.

### Deliverables

#### 1.1 Dockerized Test Database

- **File**: `testing/docker-compose.yml`
- **Purpose**: Isolated MySQL database for testing
- **Status**: ✅ Already delivered

#### 1.2 Database Reset Utility

- **File**: `testing/db-util.ts`
- **Purpose**: Programmatic database reset and seeding
- **Status**: ✅ Already delivered

#### 1.3 Enhanced Seeding Scripts

- **Files**: `scripts/generators/*.ts`
- **Enhancement**: Add scenario support (light, full, edge-cases, chaos)
- **Status**: 🔄 Requires refactoring

**Scenario Definitions**:

- **light**: 10 clients, 50 orders, 1 month of data (~30 seconds to seed)
- **full**: 60 clients, 4,400 orders, 22 months of data (~2 minutes to seed)
- **edge-cases**: Extreme AR aging, 100% whale clients, maximum consignment
- **chaos**: Random data anomalies for stress testing

#### 1.4 Package Scripts

- **File**: `package.json`
- **New Scripts**:
  - `test:env:up` - Start test database
  - `test:env:down` - Stop test database
  - `test:db:reset` - Reset and seed database
- **Status**: ✅ Already delivered

### Success Criteria

- [ ] Any developer can run `pnpm test:env:up && pnpm test:db:reset` and have a clean database in <60 seconds
- [ ] All four scenarios generate without errors
- [ ] Test database is completely isolated from development database

### Timeline

**2-3 days** (mostly refactoring existing seed scripts)

---

## Phase 2: Backend Integration Testing (Week 2-4)

### Goal

Achieve 80%+ test coverage on all backend business logic through integration tests.

### Tool Stack

- **Vitest**: Test runner (already installed)
- **Supertest**: HTTP assertions (if needed for REST endpoints)
- **tRPC Client**: Direct procedure calls for testing

### Deliverables

#### 2.1 Integration Test Configuration

- **File**: `vitest.config.integration.ts`
- **Purpose**: Dedicated config for integration tests
- **Status**: ✅ Already delivered

#### 2.2 Global Test Setup

- **File**: `testing/setup-integration.ts`
- **Purpose**: Automated database lifecycle management
- **Status**: ✅ Already delivered

#### 2.3 Integration Test Suites

**Priority 1: Critical Business Logic**

- [ ] `server/routers/orders.test.ts` - Order creation, updates, status changes
- [ ] `server/routers/invoices.test.ts` - Invoice generation, AR aging calculations
- [ ] `server/routers/clients.test.ts` - Client CRUD, whale vs regular logic
- [ ] `server/routers/inventory.test.ts` - Lot/batch management, consignment tracking

**Priority 2: Supporting Services**

- [ ] `server/services/auth.test.ts` - Authentication flows
- [ ] `server/services/permissions.test.ts` - Role-based access control
- [ ] `server/services/calculations.test.ts` - Pricing, margins, AR aging

**Priority 3: Edge Cases**

- [ ] Concurrent order creation (race conditions)
- [ ] Batch inventory depletion (negative stock prevention)
- [ ] AR aging bucket transitions (date-based logic)

#### 2.4 Test Patterns

**Example: Testing an Order Creation Flow**

```typescript
describe("Orders Router - Create Order", () => {
  it("should create order, update inventory, and generate invoice", async () => {
    // Arrange
    const client = await db.select().from(clients).limit(1);
    const batch = await db
      .select()
      .from(batches)
      .where(eq(batches.quantityAvailable, gt(0)))
      .limit(1);

    // Act
    const order = await caller.orders.create({
      clientId: client[0].id,
      items: [{ batchId: batch[0].id, quantity: 10, unitPrice: "150.00" }],
    });

    // Assert: Order created
    expect(order.id).toBeDefined();
    expect(order.total).toBe("1500.00");

    // Assert: Inventory updated
    const updatedBatch = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batch[0].id));
    expect(updatedBatch[0].quantityAvailable).toBe(
      batch[0].quantityAvailable - 10
    );

    // Assert: Invoice generated
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.orderId, order.id));
    expect(invoice).toHaveLength(1);
  });
});
```

### Success Criteria

- [ ] 80%+ code coverage on `server/` directory
- [ ] All critical business logic has integration tests
- [ ] Tests run in <3 minutes locally
- [ ] Zero false positives (flaky tests)

### Timeline

**2 weeks** (writing ~50-75 integration tests)

---

## Phase 3: Frontend E2E & Accessibility (Week 4-6)

### Goal

Guarantee critical user flows work end-to-end and meet accessibility standards.

### Tool Stack

- **Playwright**: E2E testing framework
- **@axe-core/playwright**: Automated accessibility testing
- **Playwright's built-in visual testing**: Screenshot comparison

### Deliverables

#### 3.1 Playwright Configuration

- **File**: `playwright.config.ts`
- **Status**: ✅ Already delivered

#### 3.2 E2E Global Setup

- **File**: `testing/setup-e2e.ts`
- **Purpose**: Seed database with 'full' scenario before E2E tests
- **Status**: ✅ Already delivered

#### 3.3 Critical User Flow Tests

**Priority 1: Authentication & Navigation**

- [ ] `tests-e2e/auth.spec.ts` - Sign in, sign out, session persistence
- [ ] `tests-e2e/navigation.spec.ts` - All routes accessible, no 404s

**Priority 2: Core Business Flows**

- [ ] `tests-e2e/create-client.spec.ts` - Create whale and regular clients
- [ ] `tests-e2e/create-order.spec.ts` - Multi-item order creation
- [ ] `tests-e2e/view-invoice.spec.ts` - Invoice generation and viewing
- [ ] `tests-e2e/search-inventory.spec.ts` - Search and filter inventory

**Priority 3: Complex Interactions**

- [ ] `tests-e2e/batch-operations.spec.ts` - Bulk actions on orders
- [ ] `tests-e2e/dashboard-metrics.spec.ts` - Real-time metric updates

#### 3.4 Accessibility Testing

**Automated Checks** (via axe-core):

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios

**Integration Pattern**:

```typescript
import { checkAccessibility } from "./utils/accessibility";

test("Dashboard is accessible", async ({ page }) => {
  await page.goto("/");
  await checkAccessibility(page); // Fails if violations found
});
```

#### 3.5 Visual Regression Testing

**Key Pages to Snapshot**:

- Dashboard (default state)
- Client list (with data)
- Order creation form (empty and filled)
- Invoice view (paid and overdue states)

**Pattern**:

```typescript
await expect(page).toHaveScreenshot("dashboard-default.png");
```

### Success Criteria

- [ ] 10-15 E2E tests covering all critical user journeys
- [ ] Zero accessibility violations on key pages
- [ ] Visual snapshots for 8-10 key UI states
- [ ] E2E tests run in <5 minutes in CI

### Timeline

**2 weeks** (writing E2E tests and accessibility checks)

---

## Phase 4: Advanced Quality Gates (Week 6-10)

### Goal

Add sophisticated testing methods and full CI/CD automation.

### Deliverables

#### 4.1 Contract Testing (Week 6-7)

**Tool**: Pact (consumer-driven contract testing)

**Purpose**: Prevent breaking changes between frontend and backend API

**Implementation**:

1. Frontend writes consumer contracts for critical tRPC procedures
2. Backend verifies it can fulfill those contracts
3. Contracts are versioned and stored in a Pact Broker

**Critical Contracts**:

- `orders.create` - Order creation schema
- `invoices.list` - Invoice response format
- `clients.getById` - Client detail structure

**Example Consumer Test**:

```typescript
// client/tests/contracts/orders.pact.test.ts
describe('Orders API Contract', () => {
  it('should create an order with the expected response', async () => {
    await provider
      .given('a client exists with ID 1')
      .uponReceiving('a request to create an order')
      .withRequest({
        method: 'POST',
        path: '/trpc/orders.create',
        body: { clientId: 1, items: [...] }
      })
      .willRespondWith({
        status: 200,
        body: { id: like(1), total: like('1500.00'), status: 'PENDING' }
      });
  });
});
```

**Success Criteria**:

- [ ] 5-7 critical API contracts defined
- [ ] Contract tests run on every PR
- [ ] Breaking changes are caught before merge

**Timeline**: 1 week

#### 4.2 Mutation Testing (Week 7-8)

**Tool**: Stryker (mutation testing framework)

**Purpose**: Ensure tests actually validate logic (not just execute code)

**How It Works**:

1. Stryker mutates your code (e.g., changes `>` to `>=`)
2. Runs your test suite
3. If tests still pass, the mutation "survived" (weak test)

**Configuration**:

```javascript
// stryker.conf.js
module.exports = {
  mutate: ["server/**/*.ts", "!server/**/*.test.ts"],
  testRunner: "vitest",
  coverageAnalysis: "perTest",
  thresholds: { high: 80, low: 60, break: 50 },
};
```

**Implementation Strategy**:

- Run mutation tests **nightly** (not on every PR - too slow)
- Generate weekly reports on test suite quality
- Focus on improving tests for high-risk areas

**Success Criteria**:

- [ ] 70%+ mutation score on critical business logic
- [ ] Automated nightly runs
- [ ] Weekly reports to team

**Timeline**: 1 week setup + ongoing monitoring

#### 4.3 Performance Testing (Week 8-9)

**Tool**: Playwright Performance APIs (built-in)

**Purpose**: Prevent performance regressions

**Implementation**:

```typescript
test("Dashboard loads in <2 seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const loadTime = Date.now() - start;

  expect(loadTime).toBeLessThan(2000);
});
```

**Performance Budgets**:

- Dashboard: <2s initial load
- Client list: <1.5s with 60 clients
- Order creation: <500ms form render
- Search: <300ms for autocomplete

**Success Criteria**:

- [ ] Performance budgets defined for 10 key pages
- [ ] Automated performance tests in CI
- [ ] Alerts on regression >20%

**Timeline**: 1 week

#### 4.4 CI/CD Pipeline (Week 9-10)

**Tool**: GitHub Actions

**Pipeline Architecture**:

**PR Workflow** (`pr.yml`):

```yaml
- Lint & Type Check (1-2 min)
- Unit Tests (1 min)
- Fast feedback for developers
```

**Merge Workflow** (`merge.yml`):

```yaml
- Integration Tests (3-5 min)
- E2E Tests (5-7 min)
- Build & Deploy to Staging
```

**Nightly Workflow** (`nightly.yml`):

```yaml
- Mutation Tests (30-60 min)
- Contract Verification
- Full Performance Suite
- Generate Quality Reports
```

**Success Criteria**:

- [ ] PR checks complete in <5 minutes
- [ ] Merge checks complete in <15 minutes
- [ ] Zero manual testing required for deployment
- [ ] Automated rollback on test failure

**Timeline**: 1-2 weeks

---

## Tool Stack Summary

| Category                  | Tool                 | Cost                   | Justification                                |
| :------------------------ | :------------------- | :--------------------- | :------------------------------------------- |
| **Test Runner**           | Vitest               | Free                   | Fast, TypeScript-native, already installed   |
| **E2E Testing**           | Playwright           | Free                   | Best-in-class, cross-browser, visual testing |
| **Accessibility**         | @axe-core/playwright | Free                   | Industry standard, comprehensive checks      |
| **Contract Testing**      | Pact                 | Free (OSS)             | Prevents API breaking changes                |
| **Mutation Testing**      | Stryker              | Free                   | Validates test quality                       |
| **CI/CD**                 | GitHub Actions       | Free (2,000 min/month) | Native integration, sufficient for TERP      |
| **Monitoring (Optional)** | Sentry               | $26/month              | Already in use, enhanced APM                 |

**Total Cost**: $0-26/month (depending on Sentry tier)

---

## Success Metrics & KPIs

### Coverage Metrics

- **Line Coverage**: 80%+ across backend
- **Branch Coverage**: 75%+ on critical paths
- **Mutation Score**: 70%+ on business logic

### Quality Metrics

- **Defect Escape Rate**: <5% (bugs reaching production)
- **Test Flakiness**: <2% (false positive rate)
- **Build Success Rate**: >95% on main branch

### Velocity Metrics

- **PR Cycle Time**: <10 minutes (lint + unit tests)
- **Merge Cycle Time**: <15 minutes (full suite)
- **Deployment Frequency**: Multiple per day (with confidence)

### Accessibility Metrics

- **WCAG Compliance**: 100% Level AA on critical flows
- **Keyboard Navigation**: 100% of interactive elements
- **Screen Reader Compatibility**: Zero critical violations

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Refactor seed scripts for scenario support
- [ ] Test all four scenarios (light, full, edge-cases, chaos)
- [ ] Document database reset process
- [ ] Train team on test environment usage

### Phase 2: Backend Integration (Week 2-4)

- [ ] Write integration tests for all tRPC routers
- [ ] Achieve 80%+ backend code coverage
- [ ] Set up coverage reporting
- [ ] Add integration tests to PR workflow

### Phase 3: Frontend E2E (Week 4-6)

- [ ] Write E2E tests for critical user flows
- [ ] Integrate accessibility testing
- [ ] Set up visual regression testing
- [ ] Add E2E tests to merge workflow

### Phase 4: Advanced Quality (Week 6-10)

- [ ] Implement contract testing for critical APIs
- [ ] Set up mutation testing (nightly runs)
- [ ] Add performance budgets
- [ ] Complete CI/CD pipeline automation

---

## Risk Mitigation

### Risk: Tests slow down development

**Mitigation**: Tiered CI/CD pipeline (fast feedback on PRs, comprehensive checks on merge)

### Risk: Flaky E2E tests

**Mitigation**: Use Playwright's auto-waiting, retry logic, and explicit waits

### Risk: Test maintenance burden

**Mitigation**: Focus on high-value integration tests, avoid testing implementation details

### Risk: Team resistance to testing discipline

**Mitigation**: Block merges without tests, provide clear examples, celebrate wins

---

## Next Steps

1. **Review and Approve**: Confirm this plan aligns with TERP's goals
2. **Allocate Resources**: Assign 1-2 developers to testing initiative
3. **Phase 1 Kickoff**: Begin with test data foundation (2-3 days)
4. **Weekly Check-ins**: Review progress, adjust timeline as needed
5. **Celebrate Milestones**: Recognize completion of each phase

---

## Appendix: Code Examples

All code examples, configurations, and utilities have been delivered in the previous response. Key files:

- `testing/docker-compose.yml` - Test database
- `testing/db-util.ts` - Database reset utility
- `vitest.config.integration.ts` - Integration test config
- `playwright.config.ts` - E2E test config
- `tests-e2e/auth.spec.ts` - Example E2E test
- `.github/workflows/pr.yml` - PR workflow
- `.github/workflows/merge.yml` - Merge workflow

---

**End of Master Plan**
