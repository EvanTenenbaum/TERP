# Agent Team F: UI/UX & Features

You are Agent Team F working on the TERP project. You MUST follow all protocols exactly as specified.

**Mode:** STRICT
**Branch:** `claude/team-f-ui-features-{SESSION_ID}`
**Estimate:** 40-56 hours
**Dependencies:** None - START IMMEDIATELY

---

## YOUR TASKS

| Task        | Description                             | Estimate | Module                                         |
| ----------- | --------------------------------------- | -------- | ---------------------------------------------- |
| TERP-0002   | Dashboard widget UX improvements        | 4-8h     | `client/src/components/dashboard/widgets-v2/*` |
| TERP-0003   | Add Client Wizard to ClientsWorkSurface | 1-2h     | `ClientsWorkSurface.tsx`                       |
| TERP-0005   | Reorganize navigation groups            | 2-4h     | `client/src/config/navigation.ts`              |
| TERP-0009   | Add inventory consistency tests         | 4-8h     | `tests/integration/`                           |
| TERP-0010   | Refactor getDashboardStats test mocks   | 2-4h     | `server/inventoryDb.test.ts`                   |
| TERP-0011   | Create QA test data seeding script      | 4-8h     | `scripts/seed-qa-data.ts`                      |
| TERP-0016   | Frontend data validation improvements   | 4-8h     | Various client components                      |
| TERP-0017   | Backend input hardening                 | 4-8h     | Various server routers                         |
| TERP-0018   | Error handling visibility improvements  | 4-8h     | Various components                             |
| NAV-017     | Add Missing /alerts Route               | 1h       | `client/src/App.tsx`                           |
| NAV-018     | Add Missing /reports/shrinkage Route    | 1h       | `client/src/App.tsx`                           |
| API-019     | Fix PaymentMethod Type Mismatch         | 2h       | `MultiInvoicePaymentForm.tsx`                  |
| API-020     | Fix Pagination Response Inconsistency   | 4h       | Multiple routers                               |
| OBS-003     | Add Inventory Audit Trail               | 4h       | `server/routers/inventory.ts`                  |
| TEST-010    | Add Order→Invoice→GL Integration Tests  | 8h       | `tests/integration/`                           |
| TEST-011    | Add Concurrent Operation Tests          | 4h       | `tests/integration/`                           |
| TEST-012    | Update Batch Status Transition Test Map | 2h       | `inventory.property.test.ts`                   |
| FEATURE-021 | Spreadsheet-like interfaces             | 40-56h   | Multiple (sub-agents)                          |

---

## MANDATORY PROTOCOLS

### PHASE 1: Pre-Flight (15 minutes)

```bash
# Clone, setup, read protocols
gh repo clone EvanTenenbaum/TERP && cd TERP && pnpm install
cat CLAUDE.md
cat docs/TERP_AGENT_INSTRUCTIONS.md
cat .kiro/steering/08-adaptive-qa-protocol.md

# Generate Session ID
SESSION_ID="Session-$(date +%Y%m%d)-TEAM-F-UI-$(openssl rand -hex 4)"
git pull --rebase origin main
```

### PHASE 2: Session Registration (10 minutes)

```bash
cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
# Team F: UI/UX & Features

**Session ID:** ${SESSION_ID}
**Agent:** Team F
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress
**Mode:** STRICT

## Tasks
[List all 18 tasks]

## Progress Notes
Starting UI/UX and features work...
EOF

echo "- Team-F: ${SESSION_ID} - UI Features" >> docs/ACTIVE_SESSIONS.md
git checkout -b "claude/team-f-ui-features-${SESSION_ID}"
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md
git commit -m "chore: register Team F UI Features session"
git push -u origin "claude/team-f-ui-features-${SESSION_ID}"
```

### PHASE 3: Implementation

#### Execution Order

```
Batch 1: Quick Wins (2h)
├── TERP-0003: Add Client Wizard dialog
│   - Render AddClientWizard when isAddClientOpen
│   - Wire onSuccess to refresh + navigate
├── NAV-017: /alerts route
└── NAV-018: /reports/shrinkage route

Batch 2: QA Infrastructure (4-8h)
└── TERP-0011: QA seeding script
    - Create scripts/seed-qa-data.ts
    - Seed QA_ prefixed entities
    - Add pnpm seed:qa-data command

Batch 3: Validation (8h)
├── TERP-0016: Frontend validation
│   - Add zod schemas for forms
│   - Client-side validation messages
└── TERP-0017: Backend hardening
    - Input sanitization
    - Schema validation on all inputs

Batch 4: UI Improvements (6h)
├── TERP-0002: Dashboard widgets
│   - Add EmptyState for errors
│   - Clickable leaderboard rows
│   - Time-period filters
└── TERP-0005: Navigation reorganization
    - Move Pick & Pack to Inventory
    - Move Invoices to Finance
    - Add Direct Intake, Locations, Inbox

Batch 5: Error Handling (8h)
├── TERP-0018: Error visibility
├── API-019: PaymentMethod types
└── API-020: Pagination consistency

Batch 6: Testing (8h)
├── TERP-0009: Inventory consistency tests
├── TERP-0010: Dashboard stats mocks
└── TEST-012: Batch status test map

Batch 7: Integration Tests (8h)
├── TEST-010: Order→Invoice→GL flow
├── TEST-011: Concurrent operations
└── OBS-003: Inventory audit trail

Batch 8: Large Feature (40-56h - Sub-Agents)
└── FEATURE-021: Spreadsheet interfaces
    - Sub-Agent F1: AG-Grid base (16h)
    - Sub-Agent F2: Inline editing (16h)
    - Sub-Agent F3: Keyboard nav (16h)
```

### Sub-Agent Strategy for FEATURE-021

If FEATURE-021 is included, spawn 3 sub-agents:

```bash
# Sub-Agent F1: AG-Grid Integration
SESSION_F1="Session-$(date +%Y%m%d)-F1-AGGRID-$(openssl rand -hex 4)"
# Tasks: AG-Grid setup, base component, data binding

# Sub-Agent F2: Inline Editing
SESSION_F2="Session-$(date +%Y%m%d)-F2-EDITING-$(openssl rand -hex 4)"
# Tasks: Cell editing, validation, save handlers

# Sub-Agent F3: Keyboard Navigation
SESSION_F3="Session-$(date +%Y%m%d)-F3-KEYBOARD-$(openssl rand -hex 4)"
# Tasks: Keyboard shortcuts, accessibility, focus management
```

### STRICT Mode: UI Testing

**For UI components, verify:**

```typescript
describe('TERP-0003: AddClientWizard', () => {
  it('should open wizard when button clicked', async () => {
    render(<ClientsWorkSurface />);
    await userEvent.click(screen.getByText('Add Client'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should navigate to new client on success', async () => {
    // Mock successful creation
    // Assert navigation called with /clients/{id}
  });
});
```

### PHASE 4: Validation

```bash
# Standard verification
pnpm check   # ZERO errors
pnpm lint    # PASS
pnpm test    # ALL pass
pnpm build   # SUCCESS

# UI-specific tests
pnpm test client/src/components/dashboard/
pnpm test client/src/components/work-surface/
pnpm test tests/integration/

# E2E for UI flows (if applicable)
pnpm test:e2e --grep "dashboard|navigation"
```

### PHASE 5: Completion

```bash
git commit -m "complete: Team F UI Features

Quick wins:
- TERP-0003: Client wizard in WorkSurface
- NAV-017/018: Missing routes added

QA Infrastructure:
- TERP-0011: QA seeding script

Validation:
- TERP-0016/0017: Frontend and backend validation

UI Improvements:
- TERP-0002: Dashboard widget UX
- TERP-0005: Navigation reorganization

Error Handling:
- TERP-0018, API-019, API-020

Testing:
- TERP-0009/0010, TEST-010/011/012, OBS-003

FEATURE-021: [Sub-agents completed separately]

All tests passing."
```

---

## Required Output Format

```markdown
## Team F Verification Results

✅ **Verified:**

- pnpm check: PASS
- pnpm lint: PASS
- pnpm test: PASS
- pnpm build: PASS
- E2E: PASS (dashboard, navigation tests)

🧪 **Tests Added:**

- client/src/components/work-surface/ClientsWorkSurface.test.tsx
- tests/integration/inventory-consistency.test.ts
- tests/integration/order-invoice-gl.test.ts

🖥️ **UI Changes:**

- Dashboard widgets: error states, navigation
- Navigation: reorganized groups, new routes
- Client wizard: now renders properly

⚠️ **Risk Notes:**

- Navigation changes may affect bookmarks
- Dashboard widget changes need user acceptance

🔁 **Rollback Plan:**

- Revert commits by batch
- Navigation config easily reverted

🟥 **RedHat QA (STRICT):**

- UI tested in browser: verified
- Error states: all widgets handled
- Navigation: RBAC enforced on new routes
```

---

## UI Development Rules

1. **ALWAYS test in browser** - Not just unit tests
2. **ALWAYS handle loading/error/empty states**
3. **ALWAYS check RBAC for new routes**
4. **NEVER break existing keyboard shortcuts**
5. **ALWAYS verify mobile responsiveness**
