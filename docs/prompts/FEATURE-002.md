# FEATURE-002: Change Header Color

<!-- METADATA (for validation) -->
<!-- TASK_ID: FEATURE-002 -->
<!-- TASK_TITLE: Change Header Color -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-21 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** FEATURE-002  
**Priority:** P2 (MEDIUM - UI Enhancement)  
**Estimated Time:** 1-2 hours  
**Module:** `client/src/components/layout/`

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
The application header color needs to be updated to match design requirements or improve visual consistency. The header currently uses `bg-card` class for background color and appears at the top of all pages.

**Goal:**
Update the header background color to the desired color scheme while maintaining accessibility, theme compatibility, and responsive design.

**Success Criteria:**

- [ ] Header background color updated
- [ ] Color change consistent across all pages
- [ ] Proper contrast for text and UI elements
- [ ] Works in both light and dark themes (if applicable)
- [ ] Meets WCAG accessibility guidelines
- [ ] Responsive design verified
- [ ] All tests passing
- [ ] Zero TypeScript errors

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-FEATURE-002-$(openssl rand -hex 4).md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1. `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2. Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3. If clear, add your session to the file:
   ```bash
   echo "- FEATURE-002: Session-$(date +%Y%m%d)-FEATURE-002-$(openssl rand -hex 4) ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
   ```
4. Commit and push **immediately**:
   ```bash
   git add docs/ACTIVE_SESSIONS.md
   git commit -m "Register session for FEATURE-002"
   git push origin main
   ```
5. **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate. Do not proceed until your session is successfully pushed to `main`.

### Step 1.3: Verify Environment

Run these commands:

```bash
node --version
pnpm --version
git status
```

### Step 1.4: Verify Permissions

Test your push access before starting work:
`git push --dry-run origin main`
If this command fails, you do not have the required permissions. STOP and ask the user for write access to the repository.

---

## Phase 2: Session Startup

**Objective:** Set up your workspace and update the roadmap.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature-002-header-color
```

### Step 2.2: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Find the FEATURE-002 task and update status from `📋 PLANNED` to `⏳ IN PROGRESS`.

### Step 2.3: Update Session File Progress

Update your session file with your progress.

---

## Phase 3: Development

**Objective:** Update header color with proper accessibility and theme support.

### Step 3.1: Identify Target Color

**Options:**
1. Check if design requirements specify a color
2. Review theme colors available in the design system
3. Choose a color that improves visual consistency

**If no specific color is provided:**
- Use a theme color variable (e.g., `bg-primary`, `bg-secondary`)
- Or use a CSS variable from the theme
- Or specify a hex code that matches the design system

### Step 3.2: Examine Current Implementation

1. **Read AppHeader Component:**
   ```bash
   cat client/src/components/layout/AppHeader.tsx
   ```

2. **Check Theme Configuration:**
   ```bash
   # Look for theme files
   find client/src -name "*theme*" -o -name "*colors*" -o -name "*tailwind*"
   ```

3. **Check CSS Variables:**
   ```bash
   grep -r "bg-card\|--.*color" client/src/
   ```

### Step 3.3: Update Header Color

**File:** `client/src/components/layout/AppHeader.tsx`

**Implementation Steps:**
1. Replace `bg-card` with the new color class or style
2. Ensure the color works with existing text colors
3. Check if hover states need updating
4. Verify border colors if applicable

**Example:**
```tsx
// Before
<div className="bg-card ...">

// After (example - use actual target color)
<div className="bg-primary ...">
// or
<div className="bg-[#HEXCODE]" ...>
// or
<div style={{ backgroundColor: 'var(--header-bg)' }} ...>
```

### Step 3.4: Verify Accessibility

1. **Check Contrast Ratios:**
   - Use a contrast checker tool
   - Ensure text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
   - Verify interactive elements have sufficient contrast

2. **Test with Theme Toggle:**
   - If dark mode exists, test both themes
   - Ensure color works in both light and dark modes
   - Adjust if needed for proper contrast

### Step 3.5: Test Across Pages

**Pages to Test:**
- Dashboard
- Orders
- Inventory
- Clients
- Settings
- Any other major pages

**Verification:**
- Header color consistent across all pages
- No visual regressions
- Text remains readable
- Interactive elements (buttons, links) still visible

### Step 3.6: Test Responsive Design

1. **Mobile Viewport:**
   - Test on small screens (320px, 375px, 414px)
   - Verify color looks good on mobile
   - Check touch targets still visible

2. **Tablet Viewport:**
   - Test on medium screens (768px, 1024px)

3. **Desktop Viewport:**
   - Test on large screens (1280px, 1920px)

### Step 3.7: Run Tests

```bash
# TypeScript check
pnpm check

# Run tests
pnpm test

# Build check
pnpm build
```

### Step 3.8: Commit Changes

```bash
git add client/src/components/layout/AppHeader.tsx
git commit -m "FEATURE-002: Update header background color"
```

---

## Phase 4: Completion

**Objective:** Finalize your work and submit it for review.

### Step 4.1: Verify All Deliverables

- [ ] Target color identified
- [ ] AppHeader component updated
- [ ] Tested across all major pages
- [ ] Color contrast ratios meet WCAG guidelines
- [ ] Responsive design verified
- [ ] Related CSS variables updated (if needed)
- [ ] All tests passing
- [ ] Zero TypeScript errors

### Step 4.2: Create Completion Report

Use the template at `docs/templates/COMPLETION_REPORT_TEMPLATE.md`.

**Include:**
- Color chosen and rationale
- Files modified
- Accessibility verification results
- Testing results
- Screenshots (before/after if possible)

### Step 4.3: Update Roadmap to Complete

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Update FEATURE-002 task:
- Change `- [ ]` to `- [x]`
- Change status to `✅ COMPLETE`
- Add completion date: `(Completed: YYYY-MM-DD)`
- Add key commits
- Add actual time spent

### Step 4.4: Archive Session

1. Move session file to `docs/sessions/completed/`
2. Remove from `docs/ACTIVE_SESSIONS.md`

### Step 4.5: Push to Main

```bash
git add docs/roadmaps/MASTER_ROADMAP.md docs/sessions/
git commit -m "Complete FEATURE-002: Change header color"
git push origin feature-002-header-color:main
```

**DO NOT create a pull request** - push directly to main.

### Step 4.6: Notify User

Inform the user that FEATURE-002 is complete and has been pushed to main.

---

## ⚡ Quick Reference

**Key Files:**
- `client/src/components/layout/AppHeader.tsx`

**Theme Files:**
- Check `tailwind.config.js` or similar for theme colors
- Check CSS variables in global styles

**Accessibility Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- WAVE Browser Extension
- Chrome DevTools Accessibility panel

**Commands:**
```bash
# Check current header implementation
cat client/src/components/layout/AppHeader.tsx

# Find theme configuration
find . -name "tailwind.config.*" -o -name "*.theme.*"

# Run tests
pnpm test
pnpm check
```

---

## 🆘 Troubleshooting

**Issue: Color doesn't match design requirements**
- Verify the exact color specification
- Check if design system has a specific token for header
- Consider using CSS custom properties for flexibility

**Issue: Poor contrast with text**
- Adjust text color if needed
- Consider using a darker/lighter shade of the header color
- Test with accessibility tools

**Issue: Color doesn't work in dark mode**
- Add theme-specific color classes
- Use CSS variables that change with theme
- Test both light and dark themes

**Issue: Visual regressions on other pages**
- Verify AppHeader is the only component affected
- Check if any pages have custom header styling
- Test all major pages

---

**Last Updated:** November 21, 2025

