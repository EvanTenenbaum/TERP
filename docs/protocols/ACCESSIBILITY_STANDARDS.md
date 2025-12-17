# Accessibility Standards Protocol

**Version:** 1.0
**Last Updated:** 2025-12-01
**Status:** Active & Enforced
**Target:** WCAG 2.1 Level AA Compliance

This protocol defines accessibility requirements for all user-facing code.

---

## 1. Core Requirements

### Every Interactive Element MUST Have

| Element Type | Required Attributes |
|--------------|---------------------|
| Buttons | `aria-label` (if no visible text) |
| Links | Descriptive text or `aria-label` |
| Form inputs | Associated `<label>` or `aria-label` |
| Icons (decorative) | `aria-hidden="true"` |
| Icons (informative) | `aria-label` describing meaning |
| Images | `alt` text (or `alt=""` if decorative) |
| Modals/Dialogs | `aria-modal`, `aria-labelledby` |
| Dropdowns | `role="listbox"` or `role="combobox"` |

---

## 2. Keyboard Navigation

### All Interactive Elements MUST Be

- Focusable via Tab key
- Activatable via Enter or Space
- Navigable with arrow keys (for composite widgets)
- Escapable (modals close with Escape)

### Focus Management

```typescript
// ✅ REQUIRED: Visible focus indicator
<Button className="focus:ring-2 focus:ring-primary focus:outline-none">
  Submit
</Button>

// ✅ REQUIRED: Focus trap in modals
<Dialog>
  <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
    {/* Content */}
  </DialogContent>
</Dialog>

// ✅ REQUIRED: Return focus after modal closes
const triggerRef = useRef<HTMLButtonElement>(null);

<Button ref={triggerRef} onClick={() => setOpen(true)}>
  Open Modal
</Button>

<Dialog
  open={open}
  onOpenChange={(open) => {
    setOpen(open);
    if (!open) triggerRef.current?.focus();
  }}
>
```

### Tab Order

```typescript
// ❌ BAD: Positive tabindex disrupts natural order
<input tabIndex={5} />
<button tabIndex={1} />

// ✅ GOOD: Natural order or tabIndex={0}
<input tabIndex={0} />
<button tabIndex={0} />

// ✅ GOOD: Remove from tab order (non-interactive)
<div tabIndex={-1}>Programmatically focusable only</div>
```

---

## 3. Semantic HTML

### Use Native Elements

```typescript
// ❌ BAD: Div as button
<div onClick={handleClick} className="cursor-pointer">
  Click me
</div>

// ✅ GOOD: Native button
<button onClick={handleClick}>
  Click me
</button>

// ❌ BAD: Custom checkbox without semantics
<div onClick={toggle} className={checked ? 'checked' : ''}>
  ✓
</div>

// ✅ GOOD: Native checkbox (styled)
<input
  type="checkbox"
  checked={checked}
  onChange={toggle}
  className="sr-only peer"
/>
<div className="peer-checked:bg-primary">✓</div>
```

### Heading Hierarchy

```typescript
// ❌ BAD: Skipped heading levels
<h1>Page Title</h1>
<h4>Section Title</h4> {/* Skipped h2, h3 */}

// ✅ GOOD: Sequential headings
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

### Landmark Regions

```typescript
// ✅ REQUIRED: Page structure with landmarks
<header role="banner">
  <nav role="navigation">...</nav>
</header>

<main role="main">
  <article>...</article>
  <aside role="complementary">...</aside>
</main>

<footer role="contentinfo">...</footer>
```

---

## 4. Form Accessibility

### Labels

```typescript
// ❌ BAD: Input without label
<input type="text" placeholder="Enter name" />

// ✅ GOOD: Visible label
<label htmlFor="name">Name</label>
<input id="name" type="text" />

// ✅ GOOD: Hidden label (when design requires)
<label htmlFor="search" className="sr-only">Search</label>
<input id="search" type="search" placeholder="Search..." />

// ✅ GOOD: aria-label alternative
<input
  type="search"
  aria-label="Search orders"
  placeholder="Search..."
/>
```

### Error States

```typescript
// ✅ REQUIRED: Error messages linked to input
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && (
  <p id="email-error" role="alert" className="text-destructive">
    {errors.email.message}
  </p>
)}
```

### Required Fields

```typescript
// ✅ REQUIRED: Mark required fields
<label htmlFor="name">
  Name <span aria-hidden="true">*</span>
  <span className="sr-only">(required)</span>
</label>
<input
  id="name"
  required
  aria-required="true"
/>
```

---

## 5. Color and Contrast

### Contrast Requirements

| Element | Minimum Ratio |
|---------|---------------|
| Normal text (< 18pt) | 4.5:1 |
| Large text (≥ 18pt or 14pt bold) | 3:1 |
| UI components & graphics | 3:1 |

### Color Not Sole Indicator

```typescript
// ❌ BAD: Status indicated by color only
<span className={status === 'error' ? 'text-red-500' : 'text-green-500'}>
  ●
</span>

// ✅ GOOD: Color + icon + text
<span className={status === 'error' ? 'text-red-500' : 'text-green-500'}>
  {status === 'error' ? (
    <>
      <XCircle className="inline" aria-hidden="true" /> Error
    </>
  ) : (
    <>
      <CheckCircle className="inline" aria-hidden="true" /> Success
    </>
  )}
</span>
```

---

## 6. Icons and Images

### Decorative Icons

```typescript
// ✅ CORRECT: Decorative icon hidden from screen readers
<Button>
  <Save className="mr-2" aria-hidden="true" />
  Save
</Button>
```

### Informative Icons

```typescript
// ✅ CORRECT: Icon conveys meaning
<button aria-label="Delete order">
  <Trash aria-hidden="true" />
</button>

// Or with title for sighted users too
<button aria-label="Delete order" title="Delete order">
  <Trash aria-hidden="true" />
</button>
```

### Images

```typescript
// Informative image
<img src="chart.png" alt="Sales chart showing 20% growth in Q4" />

// Decorative image
<img src="decoration.png" alt="" role="presentation" />

// Complex image
<figure>
  <img src="flowchart.png" alt="Order processing workflow" />
  <figcaption>
    Figure 1: Order processing workflow showing steps from
    order placement to delivery confirmation.
  </figcaption>
</figure>
```

---

## 7. Dynamic Content

### Live Regions

```typescript
// ✅ REQUIRED: Announce dynamic updates
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// For urgent updates
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>
```

### Loading States

```typescript
// ✅ REQUIRED: Announce loading
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? (
    <span>Loading orders...</span>
  ) : (
    <OrderList orders={orders} />
  )}
</div>

// Or with visually hidden text
{isLoading && (
  <span className="sr-only" role="status">
    Loading, please wait...
  </span>
)}
```

### Progress Updates

```typescript
// ✅ REQUIRED: Progress bar accessibility
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Upload progress"
>
  <div style={{ width: `${progress}%` }} />
</div>
```

---

## 8. Tables

### Data Tables

```typescript
// ✅ REQUIRED: Accessible table structure
<table>
  <caption>Order History</caption>
  <thead>
    <tr>
      <th scope="col">Order #</th>
      <th scope="col">Date</th>
      <th scope="col">Total</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    {orders.map(order => (
      <tr key={order.id}>
        <th scope="row">{order.number}</th>
        <td>{formatDate(order.date)}</td>
        <td>{formatCurrency(order.total)}</td>
        <td>{order.status}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### Sortable Columns

```typescript
// ✅ REQUIRED: Announce sort state
<th scope="col">
  <button
    onClick={() => sort('date')}
    aria-sort={sortColumn === 'date' ? sortDirection : 'none'}
  >
    Date
    {sortColumn === 'date' && (
      <span aria-hidden="true">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    )}
  </button>
</th>
```

---

## 9. Modal Dialogs

### Required Structure

```typescript
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
    aria-modal="true"
    role="dialog"
  >
    <DialogHeader>
      <DialogTitle id="dialog-title">
        Confirm Delete
      </DialogTitle>
      <DialogDescription id="dialog-description">
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>

    {/* Content */}

    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 10. Screen Reader Utilities

### Visually Hidden Class

```css
/* In global CSS */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Usage

```typescript
// Context for screen readers
<button>
  <Heart aria-hidden="true" />
  <span className="sr-only">Add to favorites</span>
</button>

// Additional context - link to orders list (details shown in sheet)
<a href="/orders">
  View orders
  <span className="sr-only">list</span>
</a>
```

---

## 11. Testing Requirements

### Automated Testing

```typescript
// Add to E2E tests
import { injectAxe, checkA11y } from 'axe-playwright';

test('page has no accessibility violations', async ({ page }) => {
  await page.goto('/orders');
  await injectAxe(page);
  await checkA11y(page);
});
```

### Manual Testing Checklist

- [ ] Navigate entire page using only keyboard
- [ ] Verify focus is visible on all interactive elements
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Check color contrast with browser tools
- [ ] Zoom to 200% and verify usability
- [ ] Test with reduced motion preference

---

## 12. Component Checklist

Before committing any component:

```markdown
## Accessibility Checklist

### Structure
- [ ] Uses semantic HTML elements
- [ ] Heading levels are sequential
- [ ] Lists use <ul>/<ol>/<dl>

### Interactive Elements
- [ ] All clickable elements are buttons or links
- [ ] All have visible focus indicators
- [ ] All are keyboard accessible

### Forms
- [ ] All inputs have labels
- [ ] Required fields are marked
- [ ] Errors are linked to inputs
- [ ] Error messages are descriptive

### Images & Icons
- [ ] Informative images have alt text
- [ ] Decorative images have alt=""
- [ ] Icon buttons have aria-label

### Dynamic Content
- [ ] Status updates use aria-live
- [ ] Loading states are announced
- [ ] Modals trap focus

### Color
- [ ] Contrast ratios meet requirements
- [ ] Information not conveyed by color alone
```

---

## 13. Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Axe DevTools](https://www.deque.com/axe/)
- [Radix UI Accessibility](https://www.radix-ui.com/docs/primitives/overview/accessibility)

---

**Components without proper accessibility will be rejected.**
