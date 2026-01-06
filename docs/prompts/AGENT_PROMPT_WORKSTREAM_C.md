# Agent Prompt: Workstream C - Mobile & UX Polish

## 1. Onboarding

**Welcome!** You are an AI agent tasked with improving the mobile responsiveness and user experience of TERP, a cannabis ERP system.

### Your Mission

Your focus is on UI/UX polish and mobile-specific fixes. You will work in parallel with other agents who are handling the spreadsheet view and new features.

### Key Documents

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Mobile Responsive Patterns:** `docs/MOBILE_RESPONSIVE_PATTERNS.md`
3. **Chaos Testing Report:** `docs/testing/CHAOS_TESTING_REPORT.md`

**You MUST read these documents before starting.**

### Repository Setup

```bash
# Clone the repo
gh repo clone EvanTenenbaum/TERP
cd TERP

# Install dependencies
pnpm install

# Create your feature branch
git checkout -b fix/mobile-ux-polish
```

### File Ownership

**You have permission to modify these files:**

- `client/src/components/ui/*`
- `client/src/components/layout/*`
- `client/src/styles/*`
- Any page-level CSS adjustments (e.g., `className` props)

**DO NOT modify any backend files (`server/*`).**

---

## 2. Your Tasks (Wave 1)

### Task 1: Fix Mobile Touch Targets (CHAOS-011, 4h)

**Goal:** Increase the size of small buttons and interactive elements on mobile.

**Requirements:**

1. Audit all `Button` components with `size="sm"`
2. On mobile viewports (`<md`), ensure all touch targets are at least 44x44px
3. Use responsive Tailwind classes (e.g., `sm:p-2 md:p-1`)

**Verification:**

- [ ] Small buttons are larger on mobile screens
- [ ] Buttons remain their original size on desktop

### Task 2: Fix Keyboard Covering Form Buttons (CHAOS-012, 3h)

**Goal:** Ensure form submission buttons are always visible when the on-screen keyboard is open.

**Requirements:**

1. For all major forms (e.g., Order Creator, Client Profile), ensure the submit button is not obscured by the keyboard
2. Consider using a sticky footer or scrolling the view to keep the button visible

**Verification:**

- [ ] On a mobile device, when a form input is focused, the submit button is still visible

### Task 3: Fix Table Horizontal Overflow (CHAOS-013, 2h)

**Goal:** Add horizontal scrolling to all tables on mobile.

**Requirements:**

1. Wrap all `<Table>` components in a `<div>` with `className="overflow-x-auto"`
2. Ensure tables can be scrolled horizontally on small screens

**Verification:**

- [ ] Tables on pages like Inventory, Orders, and Clients are horizontally scrollable on mobile

### Task 4: Replace Browser Confirm Dialogs (CHAOS-016, 4h)

**Goal:** Replace all native `window.confirm()` dialogs with the custom `AlertDialog` component.

**Requirements:**

1. Search the codebase for `window.confirm`
2. Replace each instance with the `AlertDialog` from `@/components/ui/alert-dialog`

**Verification:**

- [ ] Deleting an item shows a custom modal, not a browser dialog

### Task 5: Add Missing Empty States (CHAOS-017, 4h)

**Goal:** Add user-friendly empty states to pages with no data.

**Requirements:**

1. For pages like Inventory, Orders, and Clients, when there is no data, display a message like "No inventory items found. Get started by creating one."
2. Include a call-to-action button to create a new item

**Verification:**

- [ ] When the database is empty, pages show an empty state message instead of a blank table

### Task 6: Add Dashboard Loading Skeletons (CHAOS-018, 3h)

**Goal:** Add skeleton loaders to the dashboard widgets.

**Requirements:**

1. While dashboard data is loading, display skeleton loaders for each widget
2. Use the existing `Skeleton` component from `@/components/ui/skeleton`

**Verification:**

- [ ] When the dashboard is loading, skeleton placeholders are shown

---

## 3. Completion Protocol

1. **Run Checks:** Before creating a PR, run these commands:
   ```bash
   pnpm check
   pnpm test
   ```
2. **Create Pull Request:**
   - Title: `fix(ux): implement mobile and UX polish (Wave 1)`
   - Body: Link to this prompt and list completed tasks
3. **Notify Orchestrator:** Inform the orchestrator that your PR is ready for review.

---

## 4. Important Rules

- **Stick to your scope.** Do not work on tasks outside this prompt.
- **Use Gemini API for all code generation.**
- **Communicate early if you are blocked.**
- **Follow the provided file ownership rules strictly.**

Good luck! Your success depends on your ability to work independently within these constraints. Good luck!
