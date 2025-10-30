# Manus Chat Integration with TERP PM Hub

## For Manus Development Agents

If you're a Manus chat working on a TERP feature, **you MUST follow TERP's Development Protocols (The Bible)** and use this guide to register your work.

### CRITICAL: Load TERP Protocols First

Before starting ANY development work on TERP, load these files:

1. **The Bible**: `/TERP/docs/DEVELOPMENT_PROTOCOLS.md` - Non-negotiable development standards
2. **Project Context**: `/TERP/docs/PROJECT_CONTEXT.md` - Current state and architecture
3. **Dev-Brief**: `/TERP/product-management/features/[status]/[feature-id]/dev-brief.md` - Feature requirements

**All code MUST comply with protocols in The Bible. No exceptions.**

---

## Quick Registration Prompt

**Copy this into any Manus chat when you complete work:**

```
I've completed work on a TERP feature. Please register it in the PM Hub:

Feature ID: [TERP-FEAT-XXX or describe the feature]
Status: [completed/in-progress/blocked]
Work Summary: [Brief description of what was done]
Files Changed: [List of files]
Commits: [Git commit hashes if applicable]
Issues Encountered: [Any blockers or problems]
Next Steps: [What needs to happen next]

Use this API to register:
POST https://3000-id66rf050m9nb550luy4d-1adeaea7.manusvm.computer/api/trpc/pmItems.registerWork

Or update the GitHub file directly:
/TERP/product-management/features/[status]/[feature-id]/progress.md
```

---

## Automatic Registration (Recommended)

Add this to the END of your development chat:

```
---
REGISTRATION REQUEST

Please execute the following to register my work in the TERP PM Hub:

1. Identify the feature I worked on (or create new if it doesn't exist)
2. Update the feature status based on my work
3. Add progress notes with:
   - What was implemented
   - Files changed
   - Any issues encountered
   - Next steps
4. Commit changes to GitHub at:
   /TERP/product-management/features/[status]/[feature-id]/

Feature Details:
- ID: [Auto-detect from context or ask me]
- Title: [What I built]
- Status: [completed/in-progress/needs-review]
- Type: [FEAT/BUG/IMPROVE]

Work Summary:
[Automatically generate from our conversation]

Files Modified:
[List all files I created/modified]

Testing Status:
[Did I test it? Results?]

Deployment Status:
[Is it deployed? Where?]

---
```

---

## Manual Registration

If automatic doesn't work, manually create/update these files in GitHub:

### 1. Update Feature Metadata
File: `/TERP/product-management/features/[status]/[feature-id]/metadata.json`

```json
{
  "id": "TERP-FEAT-XXX",
  "title": "Feature Name",
  "status": "completed",
  "type": "FEAT",
  "priority": "high",
  "completed_by": "manus-chat-[session-id]",
  "completed_at": "2025-10-29T20:30:00Z",
  "files_changed": [
    "client/src/pages/Dashboard.tsx",
    "server/routers.ts"
  ],
  "commits": ["abc123", "def456"]
}
```

### 2. Add Progress Notes
File: `/TERP/product-management/features/[status]/[feature-id]/progress.md`

```markdown
## Progress Update - [Date]

### Completed By
Manus Chat Session: [session-id or description]

### Work Summary
[What was done]

### Files Changed
- `client/src/pages/Dashboard.tsx` - Added new stats cards
- `server/routers.ts` - Added new API endpoints

### Testing
- [x] Manual testing completed
- [x] No errors in console
- [ ] Unit tests (not applicable)

### Issues Encountered
- None / [List any issues]

### Next Steps
- Deploy to production
- Update documentation
- [Other steps]

### Screenshots
[If applicable]
```

### 3. Move Feature to Correct Status Folder

If status changed:
```bash
# Move from planned to completed
mv /TERP/product-management/features/planned/TERP-FEAT-XXX \
   /TERP/product-management/features/completed/TERP-FEAT-XXX
```

---

## API Registration (Advanced)

Use the PM Hub API directly:

```typescript
// POST to /api/trpc/pmItems.registerWork
{
  "featureId": "TERP-FEAT-XXX",
  "status": "completed",
  "workSummary": "Implemented dashboard stats cards",
  "filesChanged": ["client/src/pages/Dashboard.tsx"],
  "commits": ["abc123"],
  "completedBy": "manus-chat-session-xyz",
  "nextSteps": "Deploy to production"
}
```

---

## For New Features (Not in Roadmap)

If you built something that wasn't planned:

```
NEW FEATURE REGISTRATION

I built a new feature that wasn't in the roadmap. Please add it:

Feature Details:
- Title: [What I built]
- Description: [Detailed description]
- Type: FEAT
- Status: completed
- Priority: [low/medium/high]
- Tags: [relevant tags]

Why Built:
[Reason - bug fix, user request, improvement, etc.]

Implementation:
[Technical details]

Files Created/Modified:
[List]

Should this be added to the roadmap?
[Yes/No and why]
```

---

## Status Mapping

Map your work to these statuses:

| Your Status | PM Hub Status | When to Use |
|-------------|---------------|-------------|
| Done, working, deployed | `completed` | Feature is live and working |
| Built but not tested | `in-progress` | Code written, needs testing |
| Started, partial | `in-progress` | Work begun but not finished |
| Blocked, waiting | `on-hold` | Can't proceed without something |
| Abandoned | `archived` | Work stopped, won't finish |

---

## Examples

### Example 1: Completed Feature

```
REGISTRATION REQUEST

Feature: TERP-FEAT-015 (Advanced Inventory Filters)
Status: completed
Work Summary: Implemented filter by supplier, category, and stock level with real-time search
Files Changed:
- client/src/pages/Inventory.tsx
- client/src/components/InventoryFilters.tsx
- server/routers.ts (added filterInventory endpoint)
Commits: a1b2c3d, e4f5g6h
Testing: Manual testing complete, all filters working
Next Steps: None, ready for production
```

### Example 2: Partial Work

```
REGISTRATION REQUEST

Feature: TERP-FEAT-018 (Saved Filter Views)
Status: in-progress
Work Summary: Built UI for saving filters, backend API pending
Files Changed:
- client/src/components/SavedFilters.tsx
Issues: Need database schema for saved filters
Next Steps: Create migration, implement save/load API
```

### Example 3: New Feature

```
NEW FEATURE REGISTRATION

Title: Export Inventory to CSV
Description: Added export button that downloads current inventory view as CSV
Type: FEAT
Status: completed
Priority: medium
Tags: inventory, export, utility
Why Built: User requested in feedback
Files: client/src/pages/Inventory.tsx, client/src/utils/exportCSV.ts
```

---

## Verification

After registration, verify in PM Hub:

1. Go to https://3000-id66rf050m9nb550luy4d-1adeaea7.manusvm.computer
2. Check Dashboard stats updated
3. Find your feature in Features list
4. Verify status is correct
5. Check Timeline shows your feature

---

## Troubleshooting

**Q: Feature ID not found**
A: Create new feature or check ID format (TERP-FEAT-XXX)

**Q: API returns error**
A: Use manual GitHub file update instead

**Q: Don't know feature ID**
A: Describe the feature, system will match or create new

**Q: Multiple features in one chat**
A: Register each separately with different IDs

---

## Best Practices

1. ✅ Register work immediately after completion
2. ✅ Be specific about what was done
3. ✅ List all files changed
4. ✅ Include next steps
5. ✅ Update status accurately
6. ❌ Don't register incomplete work as "completed"
7. ❌ Don't skip registration (breaks tracking)

---

## Questions?

If unsure, just ask in your Manus chat:

```
"How do I register my work on [feature] in the TERP PM Hub?"
```

The system will guide you through the process.
