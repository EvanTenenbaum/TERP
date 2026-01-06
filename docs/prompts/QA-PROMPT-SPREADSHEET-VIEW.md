# QA-PROMPT: Spreadsheet View Comprehensive Review

**Task ID:** QA-SPREADSHEET-VIEW  
**Priority:** P1 (HIGH)  
**Estimated Effort:** 4-6 hours  
**Required Tools:** Gemini Pro 2.5, Browser, CLI

---

## UNIVERSAL AGENT PROTOCOLS

### Critical Rules (Never Break)

1. **NEVER commit directly to `main`** - Always use feature branches
2. **ALWAYS run pre-commit checks** before pushing
3. **NEVER bypass existing validation/permission systems**
4. **ALWAYS use existing tRPC routers** - No direct database access from frontend
5. **ALWAYS perform Redhat QA** before marking any task complete
6. **ALWAYS use Gemini Pro 2.5** for code analysis (API Key: `AIzaSyDnuTByhQOV6pm1gtq0JilMaF5KEIK0tVA`)

### Session Management

```bash
# Register session at start
echo "$(date -Iseconds) | QA-SPREADSHEET-VIEW | STARTED" >> docs/sessions/active-sessions.md

# Archive session at end
echo "$(date -Iseconds) | QA-SPREADSHEET-VIEW | COMPLETED" >> docs/sessions/session-archive.md
```

---

## TASK CONTEXT

### Background

The Spreadsheet View feature (FEATURE-021) provides users with a familiar spreadsheet-like interface for managing inventory and client data while maintaining full integration with the TERP ERP backend. The implementation uses AG-Grid for the spreadsheet functionality and routes all data operations through existing tRPC endpoints.

### Current Implementation

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Main Page | `client/src/pages/SpreadsheetViewPage.tsx` | Entry point with tab navigation |
| Inventory Grid | `client/src/components/spreadsheet/InventoryGrid.tsx` | AG-Grid for inventory batches |
| Client Grid | `client/src/components/spreadsheet/ClientGrid.tsx` | Master-detail layout for client orders |
| Router | `server/routers/spreadsheet.ts` | tRPC endpoints with feature flag guard |
| Service | `server/services/spreadsheetViewService.ts` | Data transformation and aggregation |
| Types | `client/src/types/spreadsheet.ts` | TypeScript interfaces |

### Critical Design Principle

> **PURE PRESENTATION LAYER**: The spreadsheet view MUST be a presentation layer ONLY. All data operations MUST flow through existing tRPC routers. NO new business logic. NO bypassing validation, permissions, or audit logging.

---

## YOUR MISSION

Perform a comprehensive QA review of the Spreadsheet View feature covering:

1. **UI/UX Quality** - Visual design, usability, accessibility
2. **Logic Correctness** - Data transformations, calculations, state management
3. **Data Integrity** - Backend integration, validation, error handling
4. **Mobile Optimization** - Responsive design, touch interactions
5. **Performance** - Loading times, rendering efficiency

Produce a detailed analysis report with specific fixes and improvements.

---

## PHASE 1: PRE-FLIGHT CHECK (15 minutes)

### 1.1 Environment Setup

```bash
# Clone and setup
gh repo clone EvanTenenbaum/TERP
cd TERP
npm install --legacy-peer-deps

# Verify feature flag exists
grep -r "spreadsheet-view" server/

# Start development server
npm run dev
```

### 1.2 Feature Flag Verification

1. Navigate to `/settings/feature-flags`
2. Ensure `spreadsheet-view` flag exists and is enabled
3. If not enabled, enable it for testing

### 1.3 Register Session

```bash
echo "$(date -Iseconds) | QA-SPREADSHEET-VIEW | STARTED | Agent: $(whoami)" >> docs/sessions/active-sessions.md
git add docs/sessions/active-sessions.md
git commit -m "chore: register QA-SPREADSHEET-VIEW session"
```

---

## PHASE 2: UI/UX REVIEW (1-2 hours)

### 2.1 Visual Inspection Checklist

Navigate to `/spreadsheet` and evaluate:

| Criterion | Check | Pass/Fail | Notes |
|-----------|-------|-----------|-------|
| **Layout** | Page header is clear and informative | | |
| **Tabs** | Inventory/Clients tabs are visible and functional | | |
| **Grid Rendering** | AG-Grid renders without visual glitches | | |
| **Column Headers** | Headers match specification (Vendor Code, Date, Source, etc.) | | |
| **Column Widths** | Columns are appropriately sized | | |
| **Color Coding** | Status cells have appropriate colors | | |
| **Loading States** | Spinner shows during data fetch | | |
| **Empty States** | Appropriate message when no data | | |
| **Error States** | Errors display clearly | | |

### 2.2 Interaction Testing

| Action | Expected Behavior | Actual | Pass/Fail |
|--------|-------------------|--------|-----------|
| Click Inventory tab | Shows inventory grid | | |
| Click Clients tab | Shows client master-detail | | |
| Click client in list | Loads client's order data | | |
| Double-click editable cell | Enters edit mode | | |
| Edit Available qty | Shows success toast, updates value | | |
| Edit Status dropdown | Shows options, updates on select | | |
| Click Refresh button | Reloads data | | |
| Sort by column | Sorts data correctly | | |
| Filter column | Filters data correctly | | |
| Pagination | Navigates between pages | | |

### 2.3 Accessibility Review

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators are visible
- [ ] Screen reader compatibility (ARIA labels)
- [ ] Color contrast meets WCAG AA
- [ ] Text is readable at 200% zoom

### 2.4 Use Gemini Pro for UI Analysis

```python
# Use Gemini Pro to analyze screenshots
import os
from google import genai

client = genai.Client(api_key="AIzaSyDnuTByhQOV6pm1gtq0JilMaF5KEIK0tVA")

# Take screenshots of the spreadsheet view and analyze
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents=[
        "Analyze this UI screenshot for usability issues, visual inconsistencies, and accessibility concerns. Provide specific recommendations.",
        # Include screenshot
    ]
)
print(response.text)
```

---

## PHASE 3: LOGIC & DATA INTEGRITY REVIEW (1-2 hours)

### 3.1 Data Transformation Verification

Review `server/services/spreadsheetViewService.ts` and verify:

| Field | Source | Transformation | Correct? |
|-------|--------|----------------|----------|
| `vendorCode` | `lot.code` or `vendor.name` | Fallback chain | |
| `lotDate` | `lot.date` | ISO format (YYYY-MM-DD) | |
| `source` | `brand.name` or `vendor.name` | Fallback chain | |
| `available` | `onHandQty - reservedQty - quarantineQty - holdQty` | Calculation | |
| `intake` | `onHandQty` | Direct mapping | |
| `ticket` | `unitCogs` | Direct mapping | |
| `sub` | `intake * ticket` | Calculation | |

### 3.2 Backend Integration Verification

Verify that edits flow through existing routers:

```bash
# Check that InventoryGrid uses existing mutations
grep -A 10 "adjustQty" client/src/components/spreadsheet/InventoryGrid.tsx
grep -A 10 "updateStatus" client/src/components/spreadsheet/InventoryGrid.tsx

# Verify these mutations exist in inventory router
grep -A 20 "adjustQty" server/routers/inventory.ts
grep -A 20 "updateStatus" server/routers/inventory.ts
```

### 3.3 Permission & Validation Testing

| Test | Steps | Expected | Actual | Pass/Fail |
|------|-------|----------|--------|-----------|
| Permission Guard | Remove `inventory:read` permission, access page | Should show error | | |
| Feature Flag Guard | Disable `spreadsheet-view` flag | Should show disabled message | | |
| Invalid Number | Enter "abc" in Available field | Should revert, show error | | |
| Negative Number | Enter "-10" in Available field | Should handle appropriately | | |
| Concurrent Edit | Edit same cell in two tabs | Should handle conflict | | |

### 3.4 Audit Log Verification

```bash
# After making an edit, verify audit log entry
# Check the audit_logs table or audit service
```

### 3.5 Use Gemini Pro for Code Analysis

```python
# Analyze the service code for logic issues
service_code = open("server/services/spreadsheetViewService.ts").read()

response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents=f"""
    Analyze this TypeScript service code for:
    1. Logic errors in data transformations
    2. Edge cases not handled
    3. Type safety issues
    4. Performance concerns
    5. Security vulnerabilities
    
    Code:
    ```typescript
    {service_code}
    ```
    
    Provide specific line numbers and fixes.
    """
)
print(response.text)
```

---

## PHASE 4: MOBILE OPTIMIZATION REVIEW (1 hour)

### 4.1 Responsive Design Testing

Test at these breakpoints:

| Breakpoint | Width | Expected Behavior | Actual | Pass/Fail |
|------------|-------|-------------------|--------|-----------|
| Mobile S | 320px | Horizontal scroll, touch-friendly | | |
| Mobile M | 375px | Horizontal scroll, touch-friendly | | |
| Mobile L | 425px | Horizontal scroll, touch-friendly | | |
| Tablet | 768px | Full grid visible, side panel | | |
| Desktop | 1024px+ | Full layout | | |

### 4.2 Mobile-Specific Issues to Check

- [ ] Grid scrolls horizontally on mobile
- [ ] Touch targets are at least 44x44px
- [ ] Pinch-to-zoom works
- [ ] Cell editing works on touch
- [ ] Client list is accessible on mobile
- [ ] Summary metrics are visible
- [ ] No horizontal overflow on page container

### 4.3 AG-Grid Mobile Configuration

Review and verify AG-Grid mobile settings:

```typescript
// Expected mobile optimizations in InventoryGrid.tsx
<AgGridReact
  // Mobile-friendly settings
  suppressHorizontalScroll={false}
  suppressColumnVirtualisation={true} // For mobile performance
  rowHeight={48} // Touch-friendly row height
  headerHeight={48}
  // ...
/>
```

### 4.4 Recommended Mobile Improvements

Document any missing mobile optimizations:

1. **Swipe Actions** - Swipe left/right for quick actions
2. **Collapsible Columns** - Hide less important columns on mobile
3. **Bottom Sheet Editor** - Use bottom sheet for cell editing on mobile
4. **Sticky Headers** - Keep headers visible while scrolling
5. **Pull-to-Refresh** - Native mobile refresh gesture

---

## PHASE 5: PERFORMANCE REVIEW (30 minutes)

### 5.1 Loading Performance

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Initial page load | < 2s | | |
| Grid data fetch | < 1s | | |
| Cell edit response | < 500ms | | |
| Tab switch | < 300ms | | |

### 5.2 Rendering Performance

```javascript
// In browser console, measure render performance
performance.mark('grid-start');
// Trigger re-render
performance.mark('grid-end');
performance.measure('grid-render', 'grid-start', 'grid-end');
console.log(performance.getEntriesByName('grid-render'));
```

### 5.3 Memory Usage

- Check for memory leaks during extended use
- Verify cleanup on component unmount
- Monitor memory with Chrome DevTools

---

## PHASE 6: PRODUCE ANALYSIS REPORT (1 hour)

### 6.1 Report Structure

Create a comprehensive report at `docs/reviews/QA-SPREADSHEET-VIEW-ANALYSIS.md`:

```markdown
# Spreadsheet View QA Analysis Report

**Date:** [DATE]
**Reviewer:** AI Agent
**Tool:** Gemini Pro 2.5

## Executive Summary
[Brief overview of findings]

## 1. UI/UX Analysis
### 1.1 Findings
### 1.2 Issues
### 1.3 Recommendations

## 2. Logic & Data Integrity Analysis
### 2.1 Findings
### 2.2 Issues
### 2.3 Recommendations

## 3. Mobile Optimization Analysis
### 3.1 Current State
### 3.2 Issues
### 3.3 Recommended Improvements

## 4. Performance Analysis
### 4.1 Metrics
### 4.2 Issues
### 4.3 Recommendations

## 5. Priority Fix List
| # | Issue | Severity | Effort | Recommendation |
|---|-------|----------|--------|----------------|

## 6. Improvement Roadmap
### Phase 1: Critical Fixes
### Phase 2: UX Enhancements
### Phase 3: Mobile Optimization

## Appendix
- Screenshots
- Code snippets
- Test results
```

### 6.2 Gemini Pro Final Analysis

```python
# Compile all findings and get Gemini Pro's final recommendations
all_findings = """
[Paste all findings from phases 2-5]
"""

response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents=f"""
    Based on these QA findings for a spreadsheet view feature in an ERP system,
    provide:
    1. A prioritized list of fixes (Critical, High, Medium, Low)
    2. Specific code changes for each fix
    3. An implementation roadmap
    4. Risk assessment for each change
    
    Findings:
    {all_findings}
    """
)
print(response.text)
```

---

## PHASE 7: IMPLEMENT FIXES (If Authorized)

### 7.1 Create Fix Branch

```bash
git checkout -b fix/spreadsheet-view-qa-$(date +%Y%m%d)
```

### 7.2 Apply Fixes

For each fix:
1. Implement the change
2. Test locally
3. Run pre-commit checks
4. Commit with descriptive message

### 7.3 Create PR

```bash
gh pr create --title "fix(spreadsheet): QA improvements for Spreadsheet View" \
  --body "## Summary
  Addresses issues found during QA review.
  
  ## Changes
  - [List changes]
  
  ## Testing
  - [Testing performed]
  
  ## Related
  - QA Report: docs/reviews/QA-SPREADSHEET-VIEW-ANALYSIS.md"
```

---

## PHASE 8: COMPLETION

### 8.1 Deliverables Checklist

- [ ] QA Analysis Report (`docs/reviews/QA-SPREADSHEET-VIEW-ANALYSIS.md`)
- [ ] Fix PR created (if fixes implemented)
- [ ] Session archived

### 8.2 Archive Session

```bash
# Remove from active sessions
sed -i '/QA-SPREADSHEET-VIEW/d' docs/sessions/active-sessions.md

# Add to archive
echo "$(date -Iseconds) | QA-SPREADSHEET-VIEW | COMPLETED | Findings: [X] issues, [Y] fixed" >> docs/sessions/session-archive.md

git add docs/sessions/
git commit -m "chore: archive QA-SPREADSHEET-VIEW session"
git push
```

### 8.3 Redhat QA Statement

Before marking complete, perform self-review:

> **Redhat QA Performed:** I have reviewed my own analysis for completeness, accuracy, and actionability. All findings are supported by evidence. All recommendations are specific and implementable.

---

## QUICK REFERENCE

### Files to Review

```
client/src/pages/SpreadsheetViewPage.tsx
client/src/components/spreadsheet/InventoryGrid.tsx
client/src/components/spreadsheet/ClientGrid.tsx
client/src/types/spreadsheet.ts
server/routers/spreadsheet.ts
server/services/spreadsheetViewService.ts
server/services/spreadsheetViewService.test.ts
```

### Key URLs

- Spreadsheet View: `/spreadsheet`
- Feature Flags: `/settings/feature-flags`
- Inventory (comparison): `/inventory`
- Clients (comparison): `/clients`

### Gemini Pro API

```python
from google import genai
client = genai.Client(api_key="AIzaSyDnuTByhQOV6pm1gtq0JilMaF5KEIK0tVA")
response = client.models.generate_content(model="gemini-2.5-pro", contents="...")
```

---

## TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Feature flag not found | Check `server/services/featureFlagService.ts` |
| AG-Grid not rendering | Verify CSS imports in component |
| Data not loading | Check tRPC endpoint in Network tab |
| Permission denied | Verify user has `inventory:read` and `orders:read` |
| Mobile layout broken | Check Tailwind responsive classes |

---

*Prompt Version: 1.0*  
*Last Updated: 2026-01-06*
