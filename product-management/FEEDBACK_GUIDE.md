# Adding Feedback & Ideas to Existing Features

**How to give feedback on specific features, sections, or add ideas to existing work**

---

## TL;DR

**Manus will interpret it perfectly.** Just be natural and use references.

**Examples**:
```
"Add dark mode support to [TERP-FEAT-015]"
"The inventory filters should also filter by supplier"
"[TERP-FEAT-018] needs a 'clear all' button"
"I want the dashboard to show profit margins"
```

The Idea Inbox agent will:
1. Understand what you're referring to
2. Link it to the existing feature
3. Create the right type of item (improvement, new idea, or bug)
4. Store it properly

---

## Method 1: Natural Language (Recommended)

**Just talk naturally and mention the feature**

### Example 1: Adding to Existing Feature

**You say**:
```
"The inventory filters should also filter by supplier, not just category"
```

**Idea Inbox agent responds**:
```
✓ Captured as [TERP-IMPROVE-001]
📂 improvements/TERP-IMPROVE-001-filter-by-supplier.md
🏷️ inventory, filters, enhancement
🔗 Related to: [TERP-FEAT-015] Advanced Inventory Filters
📍 Type: IMPROVE (enhancement to existing feature)

💡 Analysis:
This extends [TERP-FEAT-015] which currently filters by category, 
status, and date range. Adding supplier filter would require:
- Update filter UI component
- Add supplier dropdown
- Update filter logic
- Estimated: 1-2 hours

Would you like to:
1. Add this to [TERP-FEAT-015] backlog
2. Create as separate feature [TERP-FEAT-020]
3. Implement immediately
```

---

### Example 2: Feedback on In-Progress Feature

**You say**:
```
"[TERP-FEAT-018] needs a 'clear all' button for saved filters"
```

**Idea Inbox agent responds**:
```
✓ Captured as [TERP-IMPROVE-002]
📂 improvements/TERP-IMPROVE-002-clear-all-saved-filters.md
🏷️ filters, ux, quick-win
🔗 Related to: [TERP-FEAT-018] Saved Filter Views (in-progress)
📍 Type: IMPROVE

💡 Note:
[TERP-FEAT-018] is currently in progress. I'll:
1. Add this to the feature's backlog
2. Update dev-brief.md with this requirement
3. Notify the dev agent working on it

The dev agent will see this feedback and can incorporate it 
before completing the feature.

Updated: features/in-progress/TERP-FEAT-018-.../backlog.md
```

---

### Example 3: New Idea Related to Existing Feature

**You say**:
```
"I want the dashboard to show profit margins per product"
```

**Idea Inbox agent responds**:
```
✓ Captured as [TERP-IDEA-005]
📂 ideas/inbox/TERP-IDEA-005-dashboard-profit-margins.md
🏷️ dashboard, analytics, profit, metrics
🔗 Related to: 
  - [@module/dashboard] (existing module)
  - [@module/accounting] (profit data source)
  - [TERP-FEAT-012] Accounting Integration (completed)
📍 Type: IDEA (new feature)

💡 Analysis:
This is a new dashboard feature. It would:
- Add profit margin widget to dashboard
- Pull data from accounting module
- Show per-product breakdown
- Estimated: 4-6 hours

Dependencies:
- [TERP-FEAT-012] Accounting Integration ✓ (complete)
- Access to COGS and pricing data ✓ (available)

Would you like to:
1. Promote to feature now
2. Keep in inbox for later
3. Get more detailed analysis
```

---

## Method 2: Using References (Most Precise)

**When you know the exact feature ID**

### Adding Improvement to Existing Feature

**You say**:
```
"Add to [TERP-FEAT-015]: Filter by supplier"
```

**Idea Inbox agent responds**:
```
✓ Created [TERP-IMPROVE-001]
🔗 Linked to [TERP-FEAT-015]: Advanced Inventory Filters
📁 Added to: features/completed/TERP-FEAT-015-.../improvements.md

This improvement is now tracked under [TERP-FEAT-015].

Next steps:
- Review all improvements: Check features/.../TERP-FEAT-015-.../improvements.md
- Batch implement: "Implement improvements for [TERP-FEAT-015]"
- Or implement individually: "Implement [TERP-IMPROVE-001]"
```

---

### Adding Feedback to In-Progress Feature

**You say**:
```
"Feedback on [TERP-FEAT-018]: The save button should be more prominent"
```

**Idea Inbox agent responds**:
```
✓ Captured as feedback for [TERP-FEAT-018]
📁 Added to: features/in-progress/TERP-FEAT-018-.../feedback.md

**Feedback**: Save button prominence
**Type**: UX improvement
**Priority**: Medium

I've updated the dev-brief.md to include this feedback.

The dev agent working on [TERP-FEAT-018] will see this and 
can adjust the UI before completion.

Would you like me to:
1. Notify the dev agent now
2. Add as acceptance criterion
3. Create separate improvement ticket
```

---

## Method 3: Structured Format (Optional)

**For very specific feedback**

**You say**:
```
Feature: [TERP-FEAT-015]
Type: Improvement
Priority: High
Description: Add supplier filter to inventory filters
Reason: Users often need to see inventory by supplier
```

**Idea Inbox agent responds**:
```
✓ Created [TERP-IMPROVE-001] with your specifications
🔗 Linked to [TERP-FEAT-015]
⚡ Priority: High (as specified)

All details captured exactly as provided.
```

---

## How Manus Interprets Context

### Smart Linking

**You say**: "The filters are slow with lots of items"

**Manus understands**:
- "filters" → Likely [TERP-FEAT-015] Advanced Inventory Filters
- "slow" → Performance issue
- "lots of items" → Edge case with large datasets

**Creates**: [TERP-BUG-001] linked to [TERP-FEAT-015]

---

### Contextual Classification

**You say**: "Add dark mode"

**Manus classifies as**:
- Type: IDEA (new feature)
- Module: Core/Theme
- Scope: System-wide
- Complexity: Medium

**You say**: "The export button doesn't work on mobile"

**Manus classifies as**:
- Type: BUG
- Related: [TERP-FEAT-019] (if export feature exists)
- Severity: HIGH (broken functionality)
- Platform: Mobile

---

### Relationship Detection

**You say**: "Users want to export their saved filter views"

**Manus detects**:
- Related to: [TERP-FEAT-018] Saved Filter Views
- Related to: [TERP-FEAT-019] CSV Export
- Type: IDEA (combines two features)
- Opportunity: Could be added to either feature

**Suggests**:
```
💡 This combines [TERP-FEAT-018] and [TERP-FEAT-019].

Options:
1. Add to [TERP-FEAT-018] as enhancement
2. Add to [TERP-FEAT-019] as enhancement
3. Create new feature [TERP-FEAT-020] that depends on both

Recommendation: Add to [TERP-FEAT-019] since export logic 
already exists. Just need to accept saved view as input.
```

---

## Feature Feedback Workflow

### For Completed Features

**You say**: "Add supplier filter to [TERP-FEAT-015]"

**System flow**:
1. Creates [TERP-IMPROVE-001]
2. Links to [TERP-FEAT-015]
3. Adds to `features/completed/TERP-FEAT-015-.../improvements.md`
4. Tracks separately until you decide to implement

**Later, you can**:
```
"Implement improvements for [TERP-FEAT-015]"
```

**Or batch multiple**:
```
"Implement [TERP-IMPROVE-001], [TERP-IMPROVE-002], [TERP-IMPROVE-003]"
```

---

### For In-Progress Features

**You say**: "[TERP-FEAT-018] needs a clear all button"

**System flow**:
1. Creates [TERP-IMPROVE-002]
2. Links to [TERP-FEAT-018]
3. **Updates dev-brief.md** for feature in progress
4. Adds to acceptance criteria
5. Dev agent sees it immediately

**Dev agent** (working on TERP-FEAT-018):
```
✓ Loaded dev-brief.md
⚠️ New feedback detected: [TERP-IMPROVE-002]
→ Incorporating "clear all" button into current implementation
```

---

### For Planned Features

**You say**: "When we build [TERP-FEAT-020], make sure it has keyboard shortcuts"

**System flow**:
1. Creates [TERP-IMPROVE-003]
2. Links to [TERP-FEAT-020]
3. Adds to `features/planned/TERP-FEAT-020-.../requirements.md`
4. Will be included in PRD when generated

---

## Feedback File Structure

Each feature gets a `feedback.md` file:

```markdown
# Feedback: [TERP-FEAT-015] Advanced Inventory Filters

## Improvements Requested

### [TERP-IMPROVE-001] Add Supplier Filter
**Date**: 2025-10-29
**Priority**: High
**Status**: Planned
**Description**: Users need to filter inventory by supplier
**Estimated Effort**: 1-2 hours

### [TERP-IMPROVE-002] Performance with 1000+ Items
**Date**: 2025-10-29
**Priority**: Medium
**Status**: Investigating
**Description**: Filters are slow with large datasets
**Estimated Effort**: 2-3 hours

## General Feedback

### UX Feedback
- "Love the filters, very intuitive" (2025-10-29)
- "Clear all button would be helpful" (2025-10-29)

### Performance Feedback
- "Fast with ~100 items" (2025-10-29)
- "Noticeable lag with 500+ items" (2025-10-29)
```

---

## Best Practices

### DO ✅

**Be specific**:
```
Good: "Add supplier filter to [TERP-FEAT-015]"
Bad: "Filters need more options"
```

**Use references when you know them**:
```
Good: "[TERP-FEAT-018] needs a clear button"
Good: "The saved filters feature needs a clear button"
Both work, but reference is clearer
```

**Provide context**:
```
Good: "Export button doesn't work on mobile - gets cut off"
Bad: "Export broken"
```

**Mention related features**:
```
Good: "This relates to the export feature we just built"
Manus will link it automatically
```

---

### DON'T ❌

**Don't worry about perfect classification**:
```
You: "The filters should also do X"
Manus will figure out if it's:
- Improvement to existing feature
- New feature
- Bug fix
- Enhancement
```

**Don't worry about finding the exact ID**:
```
You: "The inventory filter thing"
Manus: "Did you mean [TERP-FEAT-015]?"
```

**Don't overthink the format**:
```
Natural language works perfectly:
"I think the dashboard should show profit margins"
```

---

## Examples in Practice

### Scenario 1: Feature Just Completed

**You**: "Just tested [TERP-FEAT-019] (CSV export). Works great! 
One thing - could we also add Excel format?"

**Manus**:
```
✓ Captured as [TERP-IMPROVE-004]
🔗 Linked to [TERP-FEAT-019]: CSV Export
📁 Added to improvements.md

**Type**: Enhancement
**Effort**: ~1 hour (add xlsx library, format selector)
**Priority**: Medium (nice-to-have)

Would you like to:
1. Implement now (quick addition)
2. Add to backlog for later
3. Create full feature spec first
```

---

### Scenario 2: Idea for Future Feature

**You**: "Thinking about adding a profit margin dashboard widget"

**Manus**:
```
✓ Captured as [TERP-IDEA-006]
📂 ideas/inbox/TERP-IDEA-006-profit-margin-widget.md
🏷️ dashboard, analytics, profit
🔗 Related to:
  - [@module/dashboard]
  - [TERP-FEAT-012] Accounting Integration
  
**Context Detected**:
- Module: Dashboard
- Data source: Accounting module
- Type: Analytics widget
- Complexity: Medium

This could be part of a larger "Dashboard Analytics" feature.

Would you like to:
1. Keep as standalone idea
2. Combine with other dashboard ideas
3. Plan it now
```

---

### Scenario 3: Bug in Existing Feature

**You**: "The inventory filters crash when I select more than 5 categories"

**Manus**:
```
🐛 Captured as [TERP-BUG-001]
📂 bugs/open/TERP-BUG-001-filter-crash-multiple-categories.md
🏷️ inventory, filters, crash, high-priority
🔗 Affects: [TERP-FEAT-015] Advanced Inventory Filters
⚠️ Severity: HIGH (crashes user flow)

**Reproduction**:
1. Go to inventory page
2. Open category filter
3. Select 6+ categories
4. Result: Crash

**Likely cause**: Array limit or rendering issue
**Files affected**: [@file:client/src/components/inventory/AdvancedFilters.tsx]

**Immediate action needed**. Would you like to:
1. Create dev-brief for immediate fix
2. Investigate the code first
3. Add to bug backlog
```

---

## Summary

**You can add feedback/ideas in ANY of these ways**:

1. **Natural language**: "The filters should also filter by supplier"
2. **With reference**: "[TERP-FEAT-015] should filter by supplier"
3. **Structured**: "Feature: [TERP-FEAT-015], Type: Improvement, ..."

**Manus will**:
- Understand what you mean
- Link to the right features
- Create the right type of item
- Suggest next steps
- Update relevant files

**You never need to worry about**:
- Perfect classification
- Exact IDs (natural description works)
- File structure (Manus handles it)
- Linking (automatic)

**Just talk naturally and use references when you know them.**

---

## Quick Reference

| What You Want | What You Say | What Happens |
|---------------|--------------|--------------|
| Add to existing feature | "Add X to [FEAT-015]" | Creates IMPROVE, links to feature |
| Feedback on in-progress | "[FEAT-018] needs X" | Updates dev-brief, notifies agent |
| New related idea | "Dashboard should show X" | Creates IDEA, auto-links to module |
| Report bug | "X is broken" | Creates BUG, links to affected feature |
| General feedback | "I think X would be cool" | Creates IDEA, classifies appropriately |

**The system is smart. Just be natural.**
