# BUG-007: Missing Permissions & Safety Checks

<!-- METADATA (for validation) -->
<!-- TASK_ID: BUG-007 -->
<!-- TASK_TITLE: Missing Permissions & Safety Checks -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-22 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** BUG-007  
**Priority:** P0 (CRITICAL - SAFETY)  
**Estimated Time:** 2-4 hours  
**Module:** UI Components, Safety Dialogs

---

## 📋 Table of Contents

1. [Context](#context)
2. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
3. [Phase 2: Session Startup](#phase-2-session-startup)
4. [Phase 3: Development](#phase-3-development)
5. [Phase 4: Completion](#phase-4-completion)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

**Background:**
The application uses `window.confirm()` for destructive actions instead of proper dialog components. This creates an unprofessional UI and provides poor user experience. Additionally, some destructive actions (like clearing cart) lack confirmation dialogs entirely, allowing users to accidentally lose work.

**Goal:**
Replace all `window.confirm()` calls with proper dialog components and add confirmation dialogs for all destructive actions that currently lack them.

**Success Criteria:**

- [ ] All `window.confirm()` calls replaced with proper dialog components
- [ ] Confirmation dialogs added for all destructive actions (clear cart, delete, etc.)
- [ ] Dialogs use consistent styling with the design system
- [ ] All destructive actions have proper confirmation
- [ ] User experience improved with professional dialogs
- [ ] All tests passing
- [ ] Zero TypeScript errors

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-BUG-007-$(openssl rand -hex 4).md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1. `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2. Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3. If clear, add your session to the file.
4. Commit and push **immediately**:
   ```bash
   git add docs/ACTIVE_SESSIONS.md
   git commit -m "Register session for BUG-007"
   git push origin main
   ```
5. **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate.

### Step 1.3: Verify Environment

```bash
node --version
pnpm --version
git status
```

### Step 1.4: Verify Permissions

Test your push access: `git push --dry-run origin main`

---

## Phase 2: Session Startup

**Objective:** Set up your workspace and update the roadmap.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b bug-007-permissions-safety-checks
```

### Step 2.2: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Find the BUG-007 task and update status to `⏳ IN PROGRESS`.

### Step 2.3: Update Session File Progress

Update your session file with your progress.

---

## Phase 3: Development

**Objective:** Replace window.confirm with proper dialogs and add missing confirmations.

### Step 3.1: Find All window.confirm Usage

Search for all instances of `window.confirm`:

```bash
grep -r "window.confirm" client/src --include="*.tsx" --include="*.ts"
```

**Known locations:**
- `client/src/components/vip-portal/LiveCatalog.tsx` (line ~260) - Clear draft confirmation

### Step 3.2: Find Destructive Actions Without Confirmation

Search for destructive actions that may lack confirmation:
- Clear cart/clear all buttons
- Delete actions
- Reset actions
- Discard changes

**Key files to check:**
- `client/src/components/orders/OrderPreview.tsx` - Clear All button (line ~316)
- `client/src/pages/OrderCreatorPage.tsx` - Any clear/reset actions
- Any delete buttons without confirmation dialogs

### Step 3.3: Use Existing Dialog Components

The codebase already has proper dialog components:
- `AlertDialog` from `@/components/ui/alert-dialog`
- `BulkConfirmDialog` component (see `client/src/components/inventory/BulkConfirmDialog.tsx`)

**Example pattern:**
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// In component:
const [showConfirm, setShowConfirm] = useState(false);

const handleClearAll = () => {
  setShowConfirm(true);
};

const handleConfirmClear = () => {
  // Perform action
  onClearAll();
  setShowConfirm(false);
};

// In JSX:
<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Clear All Items?</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to clear all items? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmClear} className="bg-red-600 hover:bg-red-700">
        Clear All
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Step 3.4: Replace window.confirm in LiveCatalog

**File:** `client/src/components/vip-portal/LiveCatalog.tsx`

**Current code (line ~260):**
```tsx
const handleClearDraft = () => {
  if (confirm("Are you sure you want to clear all items from your interest list?")) {
    clearDraftMutation.mutate();
  }
};
```

**Replace with:**
- Add state for confirmation dialog
- Use AlertDialog component
- Remove window.confirm call

### Step 3.5: Add Confirmation to Clear All in OrderPreview

**File:** `client/src/components/orders/OrderPreview.tsx`

**Current code (line ~316):**
```tsx
<Button
  onClick={onClearAll}
  variant="outline"
  className="w-full"
  disabled={createOrderMutation.isPending}
>
  <Trash2 className="h-4 w-4 mr-2" />
  Clear All
</Button>
```

**Add:**
- Confirmation dialog state
- AlertDialog component
- Update onClick to show dialog instead of calling onClearAll directly

### Step 3.6: Check Other Destructive Actions

Review and add confirmations for:
- Delete buttons without confirmation
- Reset to defaults buttons
- Discard changes actions
- Any other destructive operations

### Step 3.7: Test All Changes

1. Test each confirmation dialog appears correctly
2. Test cancel button works
3. Test confirm button performs action
4. Test destructive actions without dialogs now have them
5. Verify styling is consistent

---

## Phase 4: Completion

**Objective:** Finalize your work and push to main.

### Step 4.1: Verify All Deliverables

- [ ] All window.confirm calls replaced
- [ ] All destructive actions have confirmation
- [ ] Dialogs use consistent styling
- [ ] No TypeScript errors
- [ ] All tests passing

### Step 4.2: Create Completion Report

Use template: `docs/templates/COMPLETION_REPORT_TEMPLATE.md`

**Include:**
- List of all window.confirm calls replaced
- List of all new confirmation dialogs added
- Files modified
- Testing results

### Step 4.3: Update Roadmap

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Update BUG-007:
- Change status to `✅ COMPLETE`
- Add completion date: `(Completed: YYYY-MM-DD)`
- Add actual time spent
- Add key commits
- Link to completion report

### Step 4.4: Update ACTIVE_SESSIONS.md

Mark your session as complete.

### Step 4.5: Commit and Push

```bash
git add .
git commit -m "Fix BUG-007: Replace window.confirm with proper dialogs and add safety checks"
git push origin bug-007-permissions-safety-checks:main
```

**Note:** Push directly to main (no PR needed per protocol).

### Step 4.6: Archive Session

Move session file from `docs/sessions/active/` to `docs/sessions/completed/`.

---

## ⚡ Quick Reference

**Key Files:**
- `client/src/components/vip-portal/LiveCatalog.tsx` - window.confirm usage
- `client/src/components/orders/OrderPreview.tsx` - Clear All button
- `client/src/components/ui/alert-dialog.tsx` - Dialog component
- `client/src/components/inventory/BulkConfirmDialog.tsx` - Example implementation

**Key Commands:**
```bash
# Find window.confirm usage
grep -r "window.confirm" client/src

# Find destructive actions
grep -r "Clear All\|Delete\|Reset\|Discard" client/src --include="*.tsx"
```

---

## 🆘 Troubleshooting

**Issue:** Dialog doesn't appear
- **Solution:** Check state management, ensure `open` prop is set correctly

**Issue:** Action still executes without confirmation
- **Solution:** Ensure onClick handler shows dialog, doesn't call action directly

**Issue:** Styling inconsistent
- **Solution:** Use AlertDialog from UI components, follow existing patterns

---

**Last Updated:** November 22, 2025

