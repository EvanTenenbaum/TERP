# Agent Team B: Accounting & GL

You are Agent Team B working on the TERP project. You MUST follow all protocols exactly as specified.

**Mode:** RED (financial operations - highest scrutiny)
**Branch:** `claude/team-b-accounting-gl-{SESSION_ID}`
**Estimate:** 32-40 hours
**Dependencies:** BLOCKED until Team A completes ARCH-001

---

## BLOCKING DEPENDENCY

**DO NOT START until you verify ARCH-001 is complete:**

```bash
# Check if Team A has completed ARCH-001
grep "ARCH-001 COMPLETE" docs/sessions/active/coordinator.md

# If not found, WAIT. Check roadmap status:
grep -A 5 "ARCH-001" docs/roadmaps/MASTER_ROADMAP.md | grep "Status:"
# Must show: **Status:** complete
```

---

## YOUR TASKS

| Task      | Description                                 | Estimate | Module                                      |
| --------- | ------------------------------------------- | -------- | ------------------------------------------- |
| ACC-002   | Add GL Reversals for Invoice Void           | 4h       | `server/routers/invoices.ts`                |
| ACC-003   | Add GL Reversals for Returns/Credit Memos   | 4h       | `server/routers/returns.ts`                 |
| ACC-004   | Create COGS GL Entries on Sale              | 4h       | `server/services/orderAccountingService.ts` |
| ACC-005   | Fix Fiscal Period Validation                | 2h       | `server/accountingDb.ts`                    |
| ARCH-002  | Eliminate Shadow Accounting                 | 8h       | `server/services/`, `clients.ts`            |
| ARCH-003  | Use State Machine for All Order Transitions | 4h       | `server/routers/orders.ts`                  |
| ARCH-004  | Fix Bill Status Transitions                 | 4h       | `server/arApDb.ts`                          |
| TERP-0012 | Implement UI for accounting flows           | 24-40h   | `client/src/pages/accounting/*`             |

---

## MANDATORY PROTOCOLS

### PHASE 1: Pre-Flight (15 minutes)

```bash
# 1. Clone and Setup
gh repo clone EvanTenenbaum/TERP && cd TERP && pnpm install

# 2. Read ALL Protocol Documents
cat CLAUDE.md
cat docs/TERP_AGENT_INSTRUCTIONS.md
cat .kiro/steering/08-adaptive-qa-protocol.md

# 3. VERIFY DEPENDENCY (CRITICAL)
grep "ARCH-001 COMPLETE" docs/sessions/active/coordinator.md || echo "BLOCKED - WAIT FOR TEAM A"

# 4. Generate Session ID
SESSION_ID="Session-$(date +%Y%m%d)-TEAM-B-ACCOUNTING-$(openssl rand -hex 4)"

# 5. Pull Latest
git pull --rebase origin main
```

### PHASE 2: Session Registration (10 minutes)

```bash
# Create session file
cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
# Team B: Accounting & GL

**Session ID:** ${SESSION_ID}
**Agent:** Team B
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress
**Mode:** RED

## Tasks
- [ ] ACC-002: Add GL Reversals for Invoice Void
- [ ] ACC-003: Add GL Reversals for Returns/Credit Memos
- [ ] ACC-004: Create COGS GL Entries on Sale
- [ ] ACC-005: Fix Fiscal Period Validation
- [ ] ARCH-002: Eliminate Shadow Accounting
- [ ] ARCH-003: Use State Machine for All Order Transitions
- [ ] ARCH-004: Fix Bill Status Transitions
- [ ] TERP-0012: Implement UI for accounting flows

## Progress Notes
Dependency verified: ARCH-001 complete
Starting accounting work...
EOF

# Register and create branch
echo "- Team-B: ${SESSION_ID} - Accounting GL" >> docs/ACTIVE_SESSIONS.md
git checkout -b "claude/team-b-accounting-gl-${SESSION_ID}"
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md
git commit -m "chore: register Team B Accounting GL session"
git push -u origin "claude/team-b-accounting-gl-${SESSION_ID}"
```

### PHASE 3: Implementation

#### Execution Order

```
1. ACC-002 (4h)
   - Invoice void GL reversals
   - Use reverseGLEntries() from accountingHooks.ts
   - Update client.totalOwed

2. ACC-003 (4h)
   - Returns/credit memo reversals
   - Follow ACC-002 pattern
   - Create credit memo record

3. ACC-004 (4h)
   - COGS GL entries on sale
   - Debit COGS Expense, Credit Inventory Asset
   - Calculate from lineItem.unitCogs * quantity

4. ACC-005 (2h)
   - Fiscal period validation
   - Block posting to closed periods
   - Add period status check

5. ARCH-002 (8h)
   - Eliminate shadow accounting
   - Unify totalOwed calculation
   - clients.totalOwed = SUM(invoices.amountDue)

6. ARCH-003 (4h)
   - State machine for ALL order transitions
   - Call canTransition() before every status change
   - Add missing transition side effects

7. ARCH-004 (4h)
   - Bill status transitions
   - Define valid transitions
   - Add optimistic locking

8. TERP-0012 (24-40h)
   - Accounting UI
   - Can start after ACC-* complete
```

### RED MODE: Double-Entry Verification

**For every GL operation, verify:**

```typescript
// After every GL posting
const debits = await sumDebits(transactionId);
const credits = await sumCredits(transactionId);
if (Math.abs(debits - credits) > 0.01) {
  throw new Error(`GL imbalance: debits=${debits}, credits=${credits}`);
}
```

**Test pattern for each ACC-\* task:**

```typescript
describe("ACC-002: Invoice void GL reversals", () => {
  it("should create reversing GL entries on void", async () => {
    // Setup: Create invoice with GL entries
    // Action: Void invoice
    // Assert: Original entries + reversing entries sum to zero
  });

  it("should update client.totalOwed", async () => {
    // Assert: totalOwed reduced by voided amount
  });

  it("should prevent void of already-paid invoice", async () => {
    // Assert: Throws error for invalid state
  });
});
```

### PHASE 4: Testing & Validation (RED MODE)

```bash
# Standard verification
pnpm check   # ZERO errors
pnpm lint    # PASS
pnpm test    # ALL pass
pnpm build   # SUCCESS

# Accounting-specific verification
pnpm test server/routers/invoices.test.ts
pnpm test server/routers/returns.test.ts
pnpm test server/services/orderAccountingService.test.ts
pnpm test server/accountingDb.test.ts

# GL balance verification
# Run: SELECT SUM(debit) - SUM(credit) FROM gl_entries;
# Must equal 0.00
```

### PHASE 5: Completion

```bash
# Update roadmap tasks to complete
# Archive session
# Final commit
git commit -m "complete: Team B Accounting GL

Tasks completed:
- ACC-002: GL reversals for invoice void
- ACC-003: GL reversals for returns
- ACC-004: COGS GL entries on sale
- ACC-005: Fiscal period validation
- ARCH-002: Shadow accounting eliminated
- ARCH-003: State machine enforced
- ARCH-004: Bill status transitions fixed
- TERP-0012: Accounting UI implemented

GL verification: balanced
All tests passing."
```

---

## Required Output Format

```markdown
## Team B Verification Results

✅ **Verified:**

- pnpm check: PASS (0 errors)
- pnpm lint: PASS
- pnpm test: PASS
- pnpm build: PASS
- GL Balance: $0.00 (balanced)

🧪 **Tests Added:**

- server/routers/invoices.test.ts: void reversal tests
- server/routers/returns.test.ts: credit memo tests
- server/services/orderAccountingService.test.ts: COGS tests

⚠️ **Risk Notes:**

- Historical invoices may need batch COGS backfill
- Shadow accounting removal requires data migration

🔁 **Rollback Plan:**

- Revert commits: [list]
- GL entries are immutable (only reversals, never deletes)

🟥 **RedHat QA Self-Review:**

- Double-entry verified: All GL operations balanced
- Fiscal periods: Closed period posting blocked
- State machines: Invalid transitions throw errors
```

---

## Critical Financial Integrity Rules

1. **NEVER delete GL entries** - Only create reversals
2. **ALWAYS verify GL balance** after operations
3. **ALWAYS use transactions** for multi-table financial ops
4. **NEVER allow posting to closed fiscal periods**
5. **ALWAYS update client.totalOwed** when AR changes
