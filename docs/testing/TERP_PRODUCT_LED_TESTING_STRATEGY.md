# TERP Product-Led Testing Strategy

**Testing Infrastructure for Non-Technical Product Leaders**

---

## The Fundamental Shift

The original plan assumed an engineer would verify business logic, debug tests, and make technical decisions. **You're a product person, not an engineer.** This changes everything.

The new strategy is designed around **what you can validate** (product behavior, user flows, feature correctness) and delegates **everything technical** to Manus.

---

## Your Role: Product Expert & Quality Gatekeeper

You will validate three things, and **only** three things:

### 1. **Feature Correctness** (Does it work as intended?)

- "When I create an order, does the inventory decrease?"
- "When an invoice is 45 days overdue, does it show in the right AR bucket?"
- "Can whale clients see their special pricing?"

### 2. **User Flow Validation** (Can users accomplish their goals?)

- "Can I create a client, add an order, and generate an invoice without errors?"
- "Can I search for a product and add it to an order?"
- "Can I view the dashboard and see accurate metrics?"

### 3. **Edge Case Identification** (What could go wrong?)

- "What happens if I try to order more inventory than is available?"
- "What happens if a client has no orders yet?"
- "What happens if an invoice is 180 days overdue?"

**What you will NOT do**:

- ❌ Write code
- ❌ Debug TypeScript errors
- ❌ Configure test frameworks
- ❌ Interpret test coverage reports
- ❌ Fix flaky tests

---

## Manus's Role: Technical Implementer

Manus will handle **all technical work**:

### Phase 1: Foundation

- ✅ Refactor seed scripts for scenarios
- ✅ Set up Docker test database
- ✅ Create database reset utilities
- ✅ Verify everything works

### Phase 2: Integration Tests

- ✅ Generate integration tests for all backend logic
- ✅ Verify tests pass
- ✅ Achieve 80%+ code coverage
- ✅ Add tests to CI/CD

### Phase 3: E2E Tests

- ✅ Generate E2E tests for critical user flows
- ✅ Debug flaky tests
- ✅ Add accessibility checks
- ✅ Set up visual regression testing

### Phase 4: Advanced Quality

- ✅ Set up contract testing
- ✅ Configure mutation testing
- ✅ Build CI/CD pipeline
- ✅ Create monitoring dashboards

---

## The Product-Led Workflow

### Step 1: You Define the Feature/Flow (5-10 minutes)

You describe what should happen in plain English:

**Example**:

```
"I want to test the order creation flow:
1. User selects a whale client (Green Valley Dispensary)
2. User adds 10 units of Blue Dream
3. User adds 5 units of OG Kush
4. Total should be calculated correctly
5. When submitted, inventory should decrease
6. An invoice should be generated automatically"
```

### Step 2: Manus Implements the Test (30-60 minutes)

Manus:

1. Generates the E2E test code
2. Runs it against the application
3. Debugs any failures
4. Verifies it passes consistently

### Step 3: You Validate the Behavior (5-10 minutes)

Manus shows you a video or screenshot of the test running. You confirm:

- ✅ "Yes, that's the correct flow"
- ✅ "Yes, the total is calculated correctly"
- ✅ "Yes, the inventory decreased"

Or you provide feedback:

- ❌ "No, whale clients should see a 15% discount"
- ❌ "No, the invoice should be marked as 'consignment' for this vendor"

### Step 4: Manus Refines (15-30 minutes)

Manus updates the test based on your feedback and re-validates.

### Repeat for All Critical Flows

---

## The New Implementation Plan

### Week 1: Foundation (Manus Solo)

**Manus Tasks**:

- Set up test database infrastructure
- Refactor seed scripts for scenarios
- Generate initial integration tests
- Verify everything runs

**Your Tasks**:

- None (Manus works independently)

**Outcome**: Test infrastructure is ready

---

### Week 2-3: Critical User Flows (Collaborative)

**Manus Tasks**:

- Generate E2E tests for flows you define
- Debug and fix flaky tests
- Add accessibility checks

**Your Tasks** (2-3 hours per week):

1. **Define critical flows** (30 min)
   - List the 10-15 most important user journeys
   - Example: "Create client → Create order → Generate invoice → Mark paid"

2. **Review test recordings** (1-2 hours)
   - Manus shows you videos of tests running
   - You confirm: "Yes, that's correct" or "No, that's wrong because..."

3. **Identify edge cases** (30 min)
   - "What if the client has no payment method?"
   - "What if inventory is insufficient?"

**Outcome**: 10-15 E2E tests covering critical flows

---

### Week 4: Edge Cases & Refinement (Collaborative)

**Manus Tasks**:

- Generate tests for edge cases you identify
- Refine existing tests based on your feedback
- Add visual regression testing

**Your Tasks** (2-3 hours):

1. **Test the application manually** (1-2 hours)
   - Try to break things
   - Document what happens

2. **Define edge case tests** (1 hour)
   - "Test what happens when..."
   - Manus converts these to automated tests

**Outcome**: Edge cases covered, tests refined

---

### Week 5-6: Advanced Quality (Manus Solo)

**Manus Tasks**:

- Set up contract testing
- Configure mutation testing
- Build CI/CD pipeline
- Create test dashboards

**Your Tasks**:

- None (Manus works independently)

**Outcome**: Full automation in place

---

### Week 7-8: Validation & Polish (Collaborative)

**Manus Tasks**:

- Run full test suite
- Generate quality reports
- Fix any remaining issues

**Your Tasks** (2-3 hours):

1. **Review test dashboard** (30 min)
   - Manus shows you: "All tests passing, 85% coverage"
   - You confirm: "This gives me confidence to deploy"

2. **Validate key flows manually** (1-2 hours)
   - Spot-check critical features
   - Confirm automated tests match reality

3. **Sign off on deployment** (30 min)
   - "Yes, I'm confident we can deploy to production"

**Outcome**: Full testing coverage, ready for production

---

## Your Weekly Time Commitment

| Week     | Your Time | Your Activities            |
| :------- | :-------- | :------------------------- |
| Week 1   | 0 hours   | Manus works solo           |
| Week 2-3 | 4-6 hours | Define flows, review tests |
| Week 4   | 2-3 hours | Identify edge cases        |
| Week 5-6 | 0 hours   | Manus works solo           |
| Week 7-8 | 2-3 hours | Final validation           |

**Total**: 8-12 hours over 8 weeks (1-1.5 hours per week average)

---

## The Communication Protocol

### How You'll Work with Manus

#### 1. **Define Features in Plain English**

**You write**:

```
"I need to test the whale client discount feature:
- Whale clients should get 15% off all orders
- The discount should show on the order summary
- The invoice should reflect the discounted price
- Test with Green Valley Dispensary (whale client ID 1)"
```

**Manus responds**:

```
"I've generated an E2E test for the whale client discount feature.
The test:
1. Signs in as admin
2. Creates an order for Green Valley Dispensary
3. Adds products totaling $10,000
4. Verifies the discount is $1,500 (15%)
5. Verifies the final total is $8,500
6. Generates an invoice and verifies it shows $8,500

Test is passing. Video recording attached."
```

#### 2. **Review Test Recordings**

Manus will provide:

- Video of the test running
- Screenshots of key steps
- Summary of what was tested

You respond:

- ✅ "Looks good, approved"
- ❌ "The discount is wrong, it should be 20% for this specific client"

#### 3. **Identify Edge Cases**

**You write**:

```
"What happens if:
- A whale client places an order under $100? (No discount applies)
- A regular client is upgraded to whale mid-order?
- A whale client's discount changes from 15% to 20%?"
```

**Manus responds**:

```
"I've added 3 edge case tests:
1. Small order (under $100) - no discount applied ✅
2. Client upgrade mid-order - discount applied retroactively ✅
3. Discount rate change - new rate applied to future orders ✅

All tests passing."
```

---

## The Critical Difference: What Changes

### Original Plan (Engineer-Led)

- Engineer writes tests
- Engineer verifies business logic
- Engineer debugs flaky tests
- Engineer interprets coverage reports
- **Problem**: You don't have an engineer

### New Plan (Product-Led)

- **Manus writes tests**
- **You verify product behavior**
- **Manus debugs flaky tests**
- **Manus interprets coverage reports**
- **Solution**: You focus on what you know best (the product)

---

## What You Need to Provide

### 1. **Critical User Flows** (Week 2)

List the 10-15 most important user journeys in TERP:

**Example**:

1. Create a new client (whale vs regular)
2. Create a multi-item order
3. Generate an invoice from an order
4. Mark an invoice as paid
5. Search for inventory by strain
6. View AR aging report
7. Create a consignment batch
8. Update client payment terms
9. View dashboard metrics
10. Export invoice to PDF

### 2. **Edge Cases** (Week 4)

For each critical flow, identify what could go wrong:

**Example for "Create Order"**:

- Insufficient inventory
- Client has no payment method
- Product is discontinued
- Quantity is negative
- Total exceeds client credit limit

### 3. **Acceptance Criteria** (Ongoing)

For each test, define what "correct" means:

**Example**:

```
"For the AR aging report:
- Invoices 0-30 days old → 'Current' bucket
- Invoices 31-60 days old → '30 Days' bucket
- Invoices 61-90 days old → '60 Days' bucket
- Invoices 91-120 days old → '90 Days' bucket
- Invoices 120+ days old → '120+ Days' bucket"
```

---

## The Risks & Mitigations

### Risk 1: You Can't Verify Technical Correctness

**Example**: "Is the AR aging calculation mathematically correct?"

**Mitigation**: Manus will:

1. Generate tests based on your business rules
2. Run the tests against known data
3. Show you the results: "Invoice due 45 days ago → Shows in '30-60 day' bucket"
4. You confirm: "Yes, that's correct"

You're not verifying the code; you're verifying the **behavior**.

### Risk 2: You Can't Debug Flaky Tests

**Mitigation**: Manus handles all debugging. You only see the final, stable tests.

### Risk 3: You Can't Interpret Coverage Metrics

**Mitigation**: Manus translates metrics into product language:

- Not: "80% line coverage, 75% branch coverage"
- But: "All critical user flows tested, 3 edge cases remaining"

### Risk 4: You Can't Make Technical Trade-offs

**Example**: "Should we use Pact or Postman for contract testing?"

**Mitigation**: Manus makes technical decisions and explains the impact in product terms:

- "I'm using Pact for contract testing. This means we'll catch API breaking changes before they reach production."

---

## Success Criteria (Your Perspective)

At the end of 8 weeks, you should be able to say:

✅ "I can deploy to production with confidence"  
✅ "I know all critical user flows are tested"  
✅ "I know what happens in edge cases"  
✅ "I get alerts if something breaks"  
✅ "I can validate new features quickly"

**Not**:

- ❌ "I understand how Vitest works"
- ❌ "I can read TypeScript test code"
- ❌ "I know what mutation testing is"

---

## Next Steps

### Immediate (This Week)

1. **Review this strategy** - Confirm it aligns with your role and time availability
2. **Prepare your list** - Start drafting the 10-15 critical user flows
3. **Kick off with Manus** - Provide the list and let Manus start Phase 1

### Week 2 Prep

1. **Document edge cases** - For each flow, what could go wrong?
2. **Define acceptance criteria** - What does "correct" look like?
3. **Block 2-3 hours** - For reviewing test recordings

---

## The Bottom Line

**This plan is designed for you to be the product expert, not the engineer.**

Your job is to:

- Define what should happen
- Validate it works correctly
- Identify edge cases

Manus's job is:

- Write all the code
- Debug all the tests
- Build all the infrastructure
- Make all the technical decisions

**Total time commitment**: 8-12 hours over 8 weeks

**Outcome**: World-class testing coverage without writing a single line of code.

---

**End of Product-Led Strategy**
