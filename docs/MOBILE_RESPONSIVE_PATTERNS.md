# Mobile Responsive Patterns - TERP Design System

**Last Updated:** November 14, 2025  
**Status:** Active Reference Document

---

## Overview

This document defines the standard responsive patterns used throughout the TERP application. All new components and pages should follow these patterns to ensure consistent mobile responsiveness.

---

## Breakpoints

TERP uses Tailwind CSS default breakpoints with a mobile-first approach:

| Breakpoint | Min Width | Usage                                              |
| ---------- | --------- | -------------------------------------------------- |
| `sm`       | 640px     | Small tablets (portrait)                           |
| `md`       | 768px     | **Primary mobile breakpoint** - Tablets (portrait) |
| `lg`       | 1024px    | Tablets (landscape), small laptops                 |
| `xl`       | 1280px    | Laptops, desktops                                  |
| `2xl`      | 1536px    | Large desktops                                     |

**Primary breakpoint:** `md` (768px) is the main breakpoint for mobile vs desktop layouts.

---

## Core Patterns

### 1. Responsive Grid Layouts

#### Single to Multi-Column

```tsx
// Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

#### Flexible Column Count

```tsx
// Mobile: 1 column, Desktop: 2-4 columns based on space
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
  {widgets.map(widget => (
    <Widget key={widget.id} {...widget} />
  ))}
</div>
```

#### Dashboard Grid

```tsx
// Responsive dashboard layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <div className="md:col-span-2">
    <LargeWidget />
  </div>
  <div>
    <SmallWidget />
  </div>
</div>
```

---

### 2. Responsive Flexbox Layouts

#### Stack on Mobile, Row on Desktop

```tsx
// Mobile: vertical stack, Desktop: horizontal row
<div className="flex flex-col md:flex-row gap-4">
  <div className="md:w-1/3">Sidebar</div>
  <div className="md:w-2/3">Main Content</div>
</div>
```

#### Reverse Order on Mobile

```tsx
// Show image first on mobile, text first on desktop
<div className="flex flex-col-reverse md:flex-row gap-4">
  <div className="md:w-1/2">Text Content</div>
  <div className="md:w-1/2">Image</div>
</div>
```

---

### 3. Responsive Typography

#### Headings

```tsx
// H1: Mobile 24px, Tablet 30px, Desktop 36px
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Page Title
</h1>

// H2: Mobile 20px, Tablet 24px, Desktop 30px
<h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
  Section Title
</h2>

// H3: Mobile 18px, Tablet 20px, Desktop 24px
<h3 className="text-lg md:text-xl lg:text-2xl font-medium">
  Subsection Title
</h3>
```

#### Body Text

```tsx
// Standard body text
<p className="text-sm md:text-base">
  Regular paragraph text
</p>

// Small text
<span className="text-xs md:text-sm text-muted-foreground">
  Helper text or captions
</span>
```

---

### 4. Responsive Spacing

#### Padding

```tsx
// Container padding: Mobile 16px, Tablet 24px, Desktop 32px
<div className="px-4 md:px-6 lg:px-8">
  Content
</div>

// Vertical padding
<section className="py-6 md:py-8 lg:py-12">
  Section Content
</section>
```

#### Gaps

```tsx
// Grid/Flex gaps: Mobile 16px, Desktop 24px
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">Items</div>
```

#### Margins

```tsx
// Section margins
<div className="mb-6 md:mb-8 lg:mb-12">Section</div>
```

---

### 5. Responsive Visibility

#### Hide on Mobile

```tsx
// Show only on tablet and larger
<div className="hidden md:block">
  Desktop-only content
</div>

// Show only on desktop
<div className="hidden lg:block">
  Large screen only
</div>
```

#### Show Only on Mobile

```tsx
// Show only on mobile
<div className="md:hidden">
  Mobile-only content
</div>

// Show only on small screens
<div className="block md:hidden">
  Mobile-only (explicit)
</div>
```

#### Conditional Rendering with Hook

```tsx
import { useIsMobile } from "@/hooks/useMobile";

function MyComponent() {
  const isMobile = useIsMobile();

  return <>{isMobile ? <MobileView /> : <DesktopView />}</>;
}
```

---

### 6. Responsive Navigation

#### Mobile Sidebar Pattern

```tsx
// Already implemented in AppShell/AppSidebar
<aside
  className={cn(
    "flex flex-col w-64 bg-card border-r transition-transform",
    "md:relative md:translate-x-0", // Always visible on desktop
    "fixed inset-y-0 left-0 z-50", // Fixed on mobile
    open ? "translate-x-0" : "-translate-x-full" // Slide in/out
  )}
>
  Navigation Items
</aside>
```

#### Mobile Header Pattern

```tsx
// Hamburger menu on mobile, full header on desktop
<header className="flex items-center justify-between h-16 px-4 md:px-6">
  <Button
    variant="ghost"
    size="icon"
    className="md:hidden" // Hide hamburger on desktop
    onClick={onMenuClick}
  >
    <Menu className="h-5 w-5" />
  </Button>

  <div className="hidden md:flex gap-4">{/* Desktop navigation items */}</div>
</header>
```

---

### 7. Responsive Tables

#### Horizontal Scrolling

```tsx
// Table wrapper with horizontal scroll (already implemented)
<div className="relative w-full overflow-x-auto">
  <table className="w-full">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

#### Card View on Mobile (Alternative)

```tsx
function ResponsiveTable({ data }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {data.map(item => (
          <Card key={item.id}>
            <CardContent>{/* Card layout for mobile */}</CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return <Table>{/* Standard table for desktop */}</Table>;
}
```

---

### 8. Responsive Forms

#### Form Layouts

```tsx
// Single column on mobile, two columns on desktop
<form className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>First Name</Label>
      <Input type="text" />
    </div>
    <div>
      <Label>Last Name</Label>
      <Input type="text" />
    </div>
  </div>

  <div>
    <Label>Email (Full Width)</Label>
    <Input type="email" />
  </div>
</form>
```

#### Button Groups

```tsx
// Stack buttons on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-2 md:gap-4">
  <Button className="w-full md:w-auto">Primary Action</Button>
  <Button variant="outline" className="w-full md:w-auto">
    Secondary Action
  </Button>
</div>
```

---

### 9. Responsive Modals/Dialogs

#### Full Screen on Mobile

```tsx
import { useIsMobile } from "@/hooks/useMobile";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function ResponsiveModal({ open, onOpenChange, children }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh]">
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">{children}</DialogContent>
    </Dialog>
  );
}
```

---

### 10. Responsive Images

#### Responsive Image Sizing

```tsx
// Image that scales with container
<img
  src={imageUrl}
  alt="Description"
  className="w-full h-auto object-cover rounded-lg"
/>

// Fixed aspect ratio
<div className="aspect-video w-full overflow-hidden rounded-lg">
  <img
    src={imageUrl}
    alt="Description"
    className="w-full h-full object-cover"
  />
</div>
```

#### Responsive Image Grid

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {images.map(img => (
    <div key={img.id} className="aspect-square overflow-hidden rounded-lg">
      <img
        src={img.url}
        alt={img.alt}
        className="w-full h-full object-cover hover:scale-105 transition-transform"
      />
    </div>
  ))}
</div>
```

---

### 11. Responsive Charts

#### Recharts Responsive Container

```tsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from "recharts";

function ResponsiveChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

### 12. Touch Target Sizes

#### Minimum Touch Targets

```tsx
// Buttons automatically have proper touch targets
<Button size="icon">  // 40x40px minimum
  <Icon className="h-5 w-5" />
</Button>

// Custom interactive elements
<button className="p-3 min-w-[44px] min-h-[44px]">
  <Icon className="h-5 w-5" />
</button>
```

#### Spacing Between Touch Targets

```tsx
// Adequate spacing between interactive elements
<div className="flex gap-2">
  {" "}
  // 8px minimum
  <Button>Action 1</Button>
  <Button>Action 2</Button>
  <Button>Action 3</Button>
</div>
```

---

## Mobile-First Approach

### Philosophy

Write CSS for mobile first, then add larger breakpoints:

```tsx
// ✅ Good: Mobile-first
<div className="text-sm md:text-base lg:text-lg">

// ❌ Bad: Desktop-first
<div className="text-lg md:text-base sm:text-sm">
```

### Benefits

1. Smaller mobile bundle (no unused desktop styles)
2. Easier to reason about (add complexity, don't remove it)
3. Better performance on mobile devices
4. Forces consideration of mobile UX first

---

## Testing Checklist

### Manual Testing

- [ ] Test on iPhone SE (375px) - smallest modern mobile
- [ ] Test on iPhone 14 Pro (393px) - current standard
- [ ] Test on Samsung Galaxy S21 (360px) - Android standard
- [ ] Test on iPad Mini (768px) - tablet breakpoint
- [ ] Test on iPad Pro (1024px) - large tablet
- [ ] Test in portrait and landscape orientations
- [ ] Test with Chrome DevTools device emulation
- [ ] Test actual touch interactions (not just mouse)

### Automated Testing

```typescript
// Playwright example
test("mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // Test mobile-specific elements
  await expect(page.locator('[aria-label="Open menu"]')).toBeVisible();
  await expect(page.locator("aside")).not.toBeVisible();

  // Open mobile menu
  await page.click('[aria-label="Open menu"]');
  await expect(page.locator("aside")).toBeVisible();
});
```

---

## Common Pitfalls

### 1. Forgetting Mobile Padding

```tsx
// ❌ Bad: Content touches edges on mobile
<div className="px-8">

// ✅ Good: Responsive padding
<div className="px-4 md:px-8">
```

### 2. Fixed Widths

```tsx
// ❌ Bad: Fixed width breaks on mobile
<div className="w-[600px]">

// ✅ Good: Max width with full width on mobile
<div className="w-full max-w-[600px]">
```

### 3. Assuming Mouse Hover

```tsx
// ❌ Bad: Hover-only interactions
<div className="hover:bg-accent">
  Important info only visible on hover
</div>

// ✅ Good: Tap/click interactions
<button onClick={showInfo} className="hover:bg-accent active:bg-accent">
  Show Info
</button>
```

### 4. Small Touch Targets

```tsx
// ❌ Bad: Too small for touch
<button className="p-1">
  <Icon className="h-3 w-3" />
</button>

// ✅ Good: Adequate touch target
<Button size="icon">
  <Icon className="h-5 w-5" />
</Button>
```

---

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev: Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [Apple Human Interface Guidelines: Touch Targets](https://developer.apple.com/design/human-interface-guidelines/inputs/touchscreen-gestures/)
- [Material Design: Touch Targets](https://m2.material.io/design/usability/accessibility.html#layout-and-typography)

---

## Maintenance

This document should be updated when:

- New responsive patterns are established
- Breakpoints are changed
- New components with unique responsive behavior are added
- Mobile UX best practices evolve

**Last Review:** November 14, 2025  
**Next Review:** February 14, 2026 (Quarterly)

---

**Document Owner:** Development Team  
**Status:** Living Document
