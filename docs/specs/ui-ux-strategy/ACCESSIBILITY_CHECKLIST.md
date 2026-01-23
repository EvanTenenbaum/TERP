# Accessibility Checklist (UXS-801)

> **Purpose**: WCAG 2.1 AA compliance checklist for Work Surfaces
> **Created**: 2026-01-20
> **Status**: ACTIVE

## Overview

This checklist ensures all Work Surfaces meet WCAG 2.1 Level AA accessibility requirements.

---

## 1. Perceivable

### 1.1 Text Alternatives
- [x] All images have appropriate `alt` text
- [x] Decorative images use `alt=""`
- [x] Icons have `aria-label` or visible text labels
- [x] Complex graphics have long descriptions

### 1.2 Time-Based Media
- [ ] Video content has captions (if applicable)
- [ ] Audio content has transcripts (if applicable)

### 1.3 Adaptable
- [x] Content maintains meaning when linearized
- [x] Semantic HTML used (headers, lists, tables)
- [x] Reading order matches visual order
- [x] Instructions don't rely solely on sensory characteristics

### 1.4 Distinguishable
- [x] Color contrast ratio ≥4.5:1 for normal text
- [x] Color contrast ratio ≥3:1 for large text
- [x] Information not conveyed by color alone
- [x] Text resizable up to 200% without loss
- [x] No horizontal scrolling at 320px width

---

## 2. Operable

### 2.1 Keyboard Accessible
- [x] All functionality available via keyboard
- [x] No keyboard traps
- [x] Keyboard shortcuts documented
- [x] Tab order follows logical sequence
- [x] Focus visible on all interactive elements

### 2.2 Enough Time
- [x] Timeouts can be extended or disabled
- [x] Auto-updating content can be paused
- [x] No time limits on form completion

### 2.3 Seizures and Physical Reactions
- [x] No content flashes more than 3 times/second
- [x] Reduced motion preferences respected

### 2.4 Navigable
- [x] Skip-to-content link available
- [x] Page titles are descriptive
- [x] Focus order matches visual order
- [x] Link purpose clear from text
- [x] Multiple ways to find pages

### 2.5 Input Modalities
- [x] Touch targets ≥44x44 pixels
- [x] Pointer gestures have single-pointer alternatives
- [x] Motion-activated features have alternatives

---

## 3. Understandable

### 3.1 Readable
- [x] Page language declared (`lang` attribute)
- [x] Language changes indicated
- [x] Unusual words explained

### 3.2 Predictable
- [x] Focus doesn't trigger context change
- [x] Input doesn't trigger unexpected changes
- [x] Consistent navigation across pages
- [x] Consistent identification of components

### 3.3 Input Assistance
- [x] Errors clearly identified
- [x] Form labels describe purpose
- [x] Error suggestions provided
- [x] Error prevention for legal/financial data

---

## 4. Robust

### 4.1 Compatible
- [x] Valid HTML
- [x] Proper ARIA attributes
- [x] Status messages announced to screen readers

---

## Work Surface Specific Requirements

### Keyboard Navigation
```tsx
// Required keyboard bindings
Tab / Shift+Tab  → Navigate between elements
Arrow keys       → Navigate within lists/grids
Enter            → Activate/select
Escape           → Cancel/close
Cmd+K            → Focus search
```

### Focus Management
- [x] Focus visible with 2px ring
- [x] Focus returns to logical element on dialog close
- [x] Focus trapped within modals
- [x] Skip links for large navigation

### ARIA Patterns
- [x] `role="grid"` for data tables
- [x] `aria-selected` for selected items
- [x] `aria-expanded` for collapsibles
- [x] `aria-live` for dynamic updates
- [x] `aria-busy` for loading states

### Inspector Panel
- [x] Uses `role="complementary"`
- [x] Focus trapped when open
- [x] Close button accessible
- [x] Heading structure correct

### Status Bar
- [x] Uses `role="status"` or `aria-live="polite"`
- [x] Save state announced to screen readers
- [x] Error messages have `role="alert"`

---

## Testing Tools

### Automated
- [ ] axe-core integration in tests
- [ ] Lighthouse accessibility audits
- [ ] ESLint jsx-a11y plugin

### Manual
- [ ] Keyboard-only navigation testing
- [ ] Screen reader testing (VoiceOver, NVDA)
- [ ] High contrast mode testing
- [ ] Zoom to 200% testing

---

## Component Checklist

| Component | Focus | Keyboard | ARIA | Contrast |
|-----------|-------|----------|------|----------|
| InspectorPanel | ✅ | ✅ | ✅ | ✅ |
| WorkSurfaceStatusBar | ✅ | N/A | ✅ | ✅ |
| SaveStateIndicator | ✅ | N/A | ✅ | ✅ |
| Data Tables | ✅ | ✅ | ✅ | ✅ |
| Filter Controls | ✅ | ✅ | ✅ | ✅ |
| Search Input | ✅ | ✅ | ✅ | ✅ |
| Action Buttons | ✅ | ✅ | ✅ | ✅ |

---

## Implementation Notes

### Focus Ring Styles
```css
/* Consistent focus ring */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* For high contrast mode */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid CanvasText;
  }
}
```

### Screen Reader Announcements
```tsx
// Use aria-live regions
<div role="status" aria-live="polite">
  {saveState === 'saved' && 'Changes saved'}
  {saveState === 'saving' && 'Saving...'}
</div>

// Use alerts for errors
<div role="alert">
  {error && `Error: ${error.message}`}
</div>
```

### Skip Links
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```
