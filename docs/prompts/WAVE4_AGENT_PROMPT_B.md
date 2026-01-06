# Agent Prompt: Wave 4B - Accounting & Analytics Modules

## 1. Onboarding

**Welcome!** You are an AI agent tasked with fixing critical 404 errors for core business modules.

### Your Mission
Fix the 404 errors for Accounting and Analytics modules. These are P0 critical bugs that block essential business workflows.

### Key Documents to Read First
1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Strategic Plan:** `docs/roadmaps/STRATEGIC_PATH_TO_COMPLETION_20260106.md`
3. **QA Backlog:** `docs/roadmaps/QA_TASKS_BACKLOG.md`

### Repository Setup
```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b wave-4/accounting-analytics
```

### File Ownership
**You ONLY have permission to modify these files:**
- `client/src/pages/AccountingPage.tsx` (new or existing)
- `client/src/pages/AnalyticsPage.tsx` (new or existing)
- `client/src/App.tsx` (routing additions only)
- `server/routers/accounting.ts` (if needed)
- `server/routers/analytics.ts` (if needed)

---

## 2. Your Tasks (16-32h total)

| Task ID | Title | Est. Hours |
|---------|-------|------------|
| QA-002 | Fix 404 Error - Accounting Module | 8-16h |
| QA-004 | Fix 404 Error - Analytics Module | 8-16h |

### Task 1: QA-002 - Fix Accounting Module 404

**Problem:** The Accounting module returns a 404 error when accessed at `/accounting`.

**Requirements:**
1. **Create Route:**
   - Add `/accounting` route in `client/src/App.tsx`
   - Ensure proper authentication wrapper

2. **Implement AccountingPage.tsx:**
   - Create a comprehensive accounting dashboard
   - Include these views/tabs:
     - **Accounts Receivable (AR):** Outstanding invoices, aging report
     - **Accounts Payable (AP):** Bills to pay, vendor balances
     - **General Ledger:** Transaction history
     - **Reports:** P&L summary, balance sheet preview

3. **Backend Integration:**
   - Connect to existing accounting tRPC router
   - Query existing financial data from database
   - Ensure all monetary values display correctly

**Implementation Guidance:**
- Check `server/routers/` for existing accounting endpoints
- Use existing table components for data display
- Include proper number formatting for currency
- Add date range filters for reports

### Task 2: QA-004 - Fix Analytics Module 404

**Problem:** The Analytics module returns a 404 error when accessed at `/analytics`.

**Requirements:**
1. **Create Route:**
   - Add `/analytics` route in `client/src/App.tsx`
   - Ensure proper authentication wrapper

2. **Implement AnalyticsPage.tsx:**
   - Create an analytics dashboard with visualizations
   - Include these sections:
     - **Sales Overview:** Revenue trends, order volume
     - **Inventory Metrics:** Stock levels, turnover rates
     - **Client Insights:** Top clients, client growth
     - **Performance KPIs:** Key business metrics

3. **Visualization Requirements:**
   - Use Chart.js or Recharts (check existing dependencies)
   - Include at least 3 different chart types:
     - Line chart for trends
     - Bar chart for comparisons
     - Pie/Donut chart for distributions

4. **Backend Integration:**
   - Connect to analytics data endpoints
   - Aggregate data appropriately for charts
   - Support date range filtering

**Implementation Guidance:**
- Check `package.json` for existing charting libraries
- Look at dashboard components for existing chart patterns
- Ensure charts are responsive
- Add loading states for data fetching

---

## 3. Data Requirements

### Accounting Data Points
```typescript
// AR Data
interface AccountsReceivable {
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  status: 'current' | '30days' | '60days' | '90days+';
}

// AP Data
interface AccountsPayable {
  vendorId: string;
  vendorName: string;
  billNumber: string;
  amount: number;
  dueDate: Date;
}
```

### Analytics Data Points
```typescript
// Sales Analytics
interface SalesMetrics {
  period: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

// Inventory Analytics
interface InventoryMetrics {
  totalValue: number;
  totalUnits: number;
  turnoverRate: number;
  lowStockItems: number;
}
```

---

## 4. Testing Requirements

Before submitting your PR:

1. **Manual Testing:**
   - Navigate to `/accounting` - should load without 404
   - Navigate to `/analytics` - should load without 404
   - Verify AR/AP data displays correctly
   - Verify charts render with data
   - Test date range filters

2. **Automated Testing:**
   ```bash
   pnpm check  # Zero TypeScript errors
   pnpm test   # All tests pass
   ```

3. **Visual Verification:**
   - UI matches existing application style
   - Charts are readable and properly labeled
   - Tables have proper pagination
   - Loading states work correctly

---

## 5. Completion Protocol

1. **Implement all tasks** on your `wave-4/accounting-analytics` branch.

2. **Run verification:**
   ```bash
   pnpm check
   pnpm test
   ```

3. **Create a Pull Request** to `main` with:
   - Clear title: `feat(modules): implement Accounting and Analytics pages [Wave 4B]`
   - Description listing all changes
   - Screenshots of working pages and charts

4. **Generate a Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Wave 4B - Accounting & Analytics

**Branch:** `wave-4/accounting-analytics`

**Tasks to Verify:**
- [ ] **QA-002:** Navigate to `/accounting` - no 404, page loads
- [ ] **QA-002:** Verify AR aging report displays data
- [ ] **QA-002:** Verify AP balances display correctly
- [ ] **QA-004:** Navigate to `/analytics` - no 404, page loads
- [ ] **QA-004:** Verify sales charts render with data
- [ ] **QA-004:** Verify date range filters work

**Instructions:**
1. Checkout the branch
2. Run `pnpm check` and `pnpm test`
3. Manually test both routes
4. Verify charts display correctly
5. If approved, merge to main
```

---

## 6. Coordination Notes

**Parallel Agents:**
- Agent 4A is working on Todo and COGS Settings
- Agent 4C is fixing data access issues (may affect your data queries)
- No file conflicts expected - you have exclusive ownership of your files

**Dependency Note:**
- If Agent 4C's data access fixes are needed for your data to display, coordinate via PR comments
- You may need to rebase after 4C's work is merged

---

Good luck! Your work enables critical business intelligence features.
