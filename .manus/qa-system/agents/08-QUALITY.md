# AGENT QUALITY — Accessibility, Performance & Cross-Browser

## AGENT IDENTITY
```
Agent Name: QUALITY
Risk Level: 🟡 STRICT MODE
Primary Role: qa.superadmin@terp.test
Estimated Time: 30 minutes
Run Order: Phase 4 (after core domain testing)
Matrix Rows: ~35 flows
```

## YOUR MISSION

Test accessibility (WCAG 2.1 AA), performance (Core Web Vitals), and cross-browser compatibility. These are quality gates that ensure the application is usable by everyone.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

```
You are the QA analyst for TERP accessibility and performance. Manus is executing browser automation and reporting observations. Your job:

1. EVALUATE ACCESSIBILITY: WCAG 2.1 AA compliance
2. MEASURE PERFORMANCE: Core Web Vitals
3. CHECK CROSS-BROWSER: Consistent behavior across browsers
4. TEST RESPONSIVE: Mobile and tablet layouts

WCAG 2.1 AA KEY CRITERIA:
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Alt text: All images have descriptive alt
- Focus visible: Keyboard focus indicator on all interactive elements
- Heading hierarchy: H1 → H2 → H3, no skipping
- Form labels: All inputs have associated labels

CORE WEB VITALS TARGETS:
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

Repository: https://github.com/EvanTenenbaum/TERP
```

---

## TEST CATEGORIES

### CATEGORY 1: Keyboard Navigation

```
TEST QUAL-KEY-001: Tab through page

ACTION:
1. Navigate to /clients
2. Press Tab repeatedly
3. Observe focus movement

OBSERVE AND REPORT:
- Can you tab through all interactive elements?
- Is focus order logical (top to bottom, left to right)?
- Any elements skipped?
- Any focus traps?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-KEY-002: Focus visible

ACTION:
1. Tab through elements
2. Observe focus indicator

OBSERVE AND REPORT:
- Is there a visible focus ring/outline?
- Is it visible on ALL interactive elements?
- Contrast sufficient to see focus?
- Screenshot of focused element

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-KEY-003: Form submission via keyboard

ACTION:
1. Navigate to a form (e.g., create client)
2. Fill out using only Tab and typing
3. Submit using Enter

OBSERVE AND REPORT:
- Can complete form without mouse?
- Submit works with Enter?
- Any issues?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-KEY-004: Modal keyboard trap

ACTION:
1. Open a modal dialog
2. Tab through it
3. Verify focus stays in modal
4. Press Escape to close

OBSERVE AND REPORT:
- Focus trapped in modal?
- Escape closes modal?
- Focus returns to trigger element?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-KEY-005: Dropdown keyboard navigation

ACTION:
1. Find a dropdown/select
2. Use Arrow keys to navigate options
3. Press Enter to select

OBSERVE AND REPORT:
- Arrows move through options?
- Enter selects?
- Escape closes?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-KEY-006: Data table keyboard

ACTION:
1. Navigate to a data table (clients list, etc.)
2. Tab to table
3. Try to navigate rows

OBSERVE AND REPORT:
- Can you tab into table?
- Can you navigate rows?
- Can you activate row actions?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 2: Screen Reader (Simulated)

```
TEST QUAL-SR-001: Page title

ACTION:
1. Navigate to each main page
2. Check browser tab title

OBSERVE AND REPORT:
- Each page has unique, descriptive title?
- Title format: "Page Name | TERP"?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-SR-002: Heading hierarchy

ACTION:
1. Open DevTools
2. Run: Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => `${h.tagName}: ${h.textContent}`)
3. Check hierarchy

OBSERVE AND REPORT:
- Is there one H1 per page?
- Do headings follow order (H1 → H2 → H3)?
- Any skipped levels (H1 → H3)?
- List all headings found

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-SR-003: Form labels

ACTION:
1. Navigate to a form
2. Check each input for associated label
3. In DevTools: Check if labels have htmlFor matching input id

OBSERVE AND REPORT:
- All inputs have visible labels?
- Labels programmatically associated?
- Required fields indicated?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-SR-004: Image alt text

ACTION:
1. Find pages with images
2. Check alt attributes
3. Run: Array.from(document.querySelectorAll('img')).map(i => ({src: i.src, alt: i.alt}))

OBSERVE AND REPORT:
- All images have alt?
- Alt text descriptive (not "image" or "photo")?
- Decorative images have empty alt=""?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-SR-005: ARIA landmarks

ACTION:
1. Check for landmark regions
2. Run: document.querySelectorAll('[role], main, nav, header, footer, aside').length

OBSERVE AND REPORT:
- Has <main> element?
- Has <nav> element?
- Proper landmark structure?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-SR-006: Error announcement

ACTION:
1. Submit form with validation error
2. Check if error has appropriate ARIA

OBSERVE AND REPORT:
- Error connected to input via aria-describedby?
- Error has role="alert" or aria-live?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 3: Color & Contrast

```
TEST QUAL-COLOR-001: Text contrast

ACTION:
1. Use browser extension or DevTools to check contrast
2. Sample several text elements

OBSERVE AND REPORT:
- Normal text contrast ratio: ____:1 (need 4.5:1)
- Large text contrast ratio: ____:1 (need 3:1)
- Any failures?
- Screenshot of low contrast elements

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-COLOR-002: Color not sole indicator

ACTION:
1. Find elements that use color to convey meaning (error states, status badges)
2. Check if there's another indicator (icon, text, pattern)

OBSERVE AND REPORT:
- Errors: Red color + icon/text?
- Success: Green color + icon/text?
- Warnings: Yellow color + icon/text?
- Any color-only indicators?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-COLOR-003: Focus indicator contrast

ACTION:
1. Tab to interactive elements
2. Check focus ring visibility

OBSERVE AND REPORT:
- Focus ring visible against background?
- Contrast sufficient?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 4: Performance - Core Web Vitals

```
TEST QUAL-PERF-001: Dashboard LCP

ACTION:
1. Open DevTools > Performance
2. Clear cache (hard refresh)
3. Navigate to /dashboard
4. Measure Largest Contentful Paint

OBSERVE AND REPORT:
- LCP time: ____ ms
- What element was LCP?
- Target: < 2500ms

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-PERF-002: Inventory list LCP

ACTION:
1. Clear cache
2. Navigate to /inventory
3. Measure LCP

OBSERVE AND REPORT:
- LCP time: ____ ms
- Target: < 2500ms

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-PERF-003: CLS (Layout Shift)

ACTION:
1. Open DevTools > Performance
2. Load /dashboard
3. Observe for layout shifts during load

OBSERVE AND REPORT:
- CLS score: ____
- Any visible layout shifts?
- What elements shifted?
- Target: < 0.1

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-PERF-004: First Input Delay

ACTION:
1. Load page
2. Click on first interactive element as soon as possible
3. Note any delay

OBSERVE AND REPORT:
- Felt responsive?
- Any noticeable delay before action?
- Target: < 100ms

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-PERF-005: Large list performance

ACTION:
1. Navigate to client list with many items
2. Scroll through list
3. Observe smoothness

OBSERVE AND REPORT:
- Scroll smooth?
- Any jank/stuttering?
- Pagination working?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 5: Cross-Browser Testing

```
TEST QUAL-BROWSER-001: Chrome latest

ACTION:
1. Test in Chrome (primary browser)
2. Run through key flows:
   - Login
   - Dashboard
   - Create client
   - Create order

OBSERVE AND REPORT:
- All flows work?
- Any visual issues?
- Any console errors?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-BROWSER-002: Firefox latest

ACTION:
1. Open Firefox
2. Run same key flows

OBSERVE AND REPORT:
- All flows work?
- Any differences from Chrome?
- Any visual issues?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-BROWSER-003: Safari (if available)

ACTION:
1. Open Safari
2. Run key flows

OBSERVE AND REPORT:
- All flows work?
- Any Safari-specific issues?
- Date pickers work?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-BROWSER-004: Edge

ACTION:
1. Open Edge
2. Run key flows

OBSERVE AND REPORT:
- All flows work?
- Any issues?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 6: Responsive Design

```
TEST QUAL-RESP-001: Mobile 375px

ACTION:
1. DevTools > Device toolbar
2. Set to iPhone (375px width)
3. Navigate through app

OBSERVE AND REPORT:
- Navigation becomes hamburger?
- Content readable without horizontal scroll?
- Touch targets large enough (44×44px)?
- Forms usable?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-RESP-002: Tablet 768px

ACTION:
1. Set viewport to 768px
2. Navigate through app

OBSERVE AND REPORT:
- Layout adapts appropriately?
- Good use of space?
- Any overlap/cut-off?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-RESP-003: Large desktop 1920px

ACTION:
1. Set viewport to 1920px
2. Navigate through app

OBSERVE AND REPORT:
- Layout uses space well?
- No excessive whitespace?
- Content not stretched?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST QUAL-RESP-004: Text resize 200%

ACTION:
1. Browser zoom to 200%
2. Navigate through app

OBSERVE AND REPORT:
- Text readable?
- No overlap?
- Horizontal scroll minimal?
- Functions still work?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 7: Print Styles (if applicable)

```
TEST QUAL-PRINT-001: Invoice print view

ACTION:
1. Open an invoice detail
2. Print preview (Ctrl+P)
3. Observe

OBSERVE AND REPORT:
- Clean print layout?
- Navigation hidden?
- All data visible?
- Proper page breaks?

SEND TO CLAUDE FOR ANALYSIS
```

---

## FINAL REPORT FORMAT

```markdown
## AGENT QUALITY — Final Report

### Summary
- Total Tests: [N]
- PASS: [N]
- FAIL: [N]
- BLOCKED: [N]

### Accessibility (WCAG 2.1 AA)
| Criterion | Status | Notes |
|-----------|--------|-------|
| Keyboard navigation | ✅ | All elements reachable |
| Focus visible | ✅ | Clear focus ring |
| Color contrast | ⚠️ | Some labels below 4.5:1 |
| Alt text | ✅ | All images have alt |
| Form labels | ✅ | All inputs labeled |
| Heading hierarchy | ✅ | Proper structure |
| ARIA landmarks | ✅ | Main, nav present |

### Performance (Core Web Vitals)
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP (Dashboard) | 1.8s | < 2.5s | ✅ |
| LCP (Inventory) | 2.2s | < 2.5s | ✅ |
| CLS | 0.05 | < 0.1 | ✅ |
| FID | 50ms | < 100ms | ✅ |

### Cross-Browser
| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ | Primary, all pass |
| Firefox | ✅ | No issues |
| Safari | ⚠️ | Date picker styling |
| Edge | ✅ | No issues |

### Responsive
| Viewport | Status |
|----------|--------|
| Mobile 375px | ✅ |
| Tablet 768px | ✅ |
| Desktop 1920px | ✅ |
| 200% zoom | ✅ |

### Findings
| ID | Test | Severity | Description |
|----|------|----------|-------------|
| QUAL-001 | COLOR-001 | P2 | Label text contrast 3.8:1, needs 4.5:1 |

AWAITING CLAUDE FINAL ANALYSIS
```
