# Specification: ENH-008 - Image Toggle for Inventory/Catalogue Views

**Status:** Draft
**Priority:** MEDIUM
**Estimate:** 16h
**Module:** Frontend / Inventory / Catalogue
**Dependencies:** None
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

Users need the ability to toggle product images on and off in inventory and catalogue views. This applies to both internal user-facing views (inventory browser, sales sheets) and customer-facing views (VIP portal, catalogues). Some users prefer image-free views for faster loading and denser data display, while others need images for product identification.

## 2. User Stories

1. **As a sales rep**, I want to toggle images off in the inventory browser, so that I can see more products at once and the page loads faster.

2. **As a warehouse worker**, I want to quickly toggle images on to verify products visually during picking.

3. **As an admin**, I want to configure whether customer-facing catalogues show images by default.

4. **As a customer**, I want to toggle images in my portal view based on my preference.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Toggle button to show/hide images in inventory browser | Must Have |
| FR-02 | Toggle persists per user session | Must Have |
| FR-03 | Toggle available in VIP/customer portal | Must Have |
| FR-04 | Admin setting for default image visibility | Should Have |
| FR-05 | Lazy loading when images enabled | Must Have |
| FR-06 | Placeholder when image not available | Must Have |
| FR-07 | Toggle applies to table and grid views | Must Have |

## 4. Technical Specification

### 4.1 User Preferences Hook

**File:** `/home/user/TERP/client/src/hooks/useImageVisibility.ts`

```typescript
import { useState, useEffect } from "react";

const STORAGE_KEY = "terp_image_visibility";

interface ImageVisibilitySettings {
  inventory: boolean;
  catalogue: boolean;
  vipPortal: boolean;
}

const defaults: ImageVisibilitySettings = {
  inventory: true,
  catalogue: true,
  vipPortal: true,
};

export function useImageVisibility(context: keyof ImageVisibilitySettings) {
  const [showImages, setShowImages] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaults[context];

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed[context] ?? defaults[context];
      } catch {
        return defaults[context];
      }
    }
    return defaults[context];
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : {};
    current[context] = showImages;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }, [showImages, context]);

  return {
    showImages,
    setShowImages,
    toggleImages: () => setShowImages(prev => !prev),
  };
}
```

### 4.2 Image Toggle Button Component

**File:** `/home/user/TERP/client/src/components/ui/image-toggle.tsx`

```typescript
import { Button } from "@/components/ui/button";
import { Image, ImageOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ImageToggleProps {
  showImages: boolean;
  onToggle: () => void;
  size?: "sm" | "default";
}

export function ImageToggle({ showImages, onToggle, size = "default" }: ImageToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size={size}
          onClick={onToggle}
          className={showImages ? "" : "text-muted-foreground"}
        >
          {showImages ? (
            <Image className="h-4 w-4" />
          ) : (
            <ImageOff className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {showImages ? "Hide images" : "Show images"}
      </TooltipContent>
    </Tooltip>
  );
}
```

### 4.3 Product Image Component with Lazy Loading

**File:** `/home/user/TERP/client/src/components/products/ProductImage.tsx`

```typescript
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImageOff, Package } from "lucide-react";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  showImage: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

export function ProductImage({
  src,
  alt,
  className,
  showImage,
  size = "md",
}: ProductImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!showImage || !src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = src;
            observer.disconnect();
          }
        });
      },
      { rootMargin: "50px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [showImage, src]);

  // Don't render anything if images disabled
  if (!showImage) {
    return null;
  }

  // Placeholder for missing images
  if (!src || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded",
          sizeClasses[size],
          className
        )}
      >
        <Package className="h-1/2 w-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded", sizeClasses[size], className)}>
      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        ref={imgRef}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-opacity",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
```

### 4.4 Integration with Inventory Browser

**File:** `/home/user/TERP/client/src/components/inventory/InventoryBrowserTable.tsx`

```typescript
import { useImageVisibility } from "@/hooks/useImageVisibility";
import { ImageToggle } from "@/components/ui/image-toggle";
import { ProductImage } from "@/components/products/ProductImage";

export function InventoryBrowserTable({ /* ... */ }) {
  const { showImages, toggleImages } = useImageVisibility("inventory");

  // Add to toolbar
  const toolbar = (
    <div className="flex items-center gap-2">
      {/* ... other toolbar items */}
      <ImageToggle showImages={showImages} onToggle={toggleImages} />
    </div>
  );

  // In table columns
  const columns = [
    // Image column (conditional)
    ...(showImages ? [{
      id: "image",
      header: "",
      width: "60px",
      accessor: (item) => (
        <ProductImage
          src={item.imageUrl}
          alt={item.productName}
          showImage={showImages}
          size="sm"
        />
      ),
    }] : []),
    // ... other columns
  ];

  return (
    <div>
      {toolbar}
      <Table columns={columns} data={data} />
    </div>
  );
}
```

### 4.5 Admin Settings for Default Visibility

**File:** `/home/user/TERP/server/routers/settings.ts`

```typescript
// Add to system settings
settings.updateImageDefaults = adminProcedure
  .input(z.object({
    showImagesInInventory: z.boolean(),
    showImagesInCatalogue: z.boolean(),
    showImagesInVipPortal: z.boolean(),
  }))
  .mutation(async ({ input }) => {
    // Store in system_settings table
  });

settings.getImageDefaults = publicProcedure
  .output(z.object({
    showImagesInInventory: z.boolean(),
    showImagesInCatalogue: z.boolean(),
    showImagesInVipPortal: z.boolean(),
  }))
  .query(async () => {
    // Return from system_settings table
  });
```

### 4.6 Database Schema Addition

```sql
-- Add to system_settings or create new table
CREATE TABLE image_display_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  context VARCHAR(50) NOT NULL UNIQUE, -- 'inventory', 'catalogue', 'vip_portal'
  show_images_default BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO image_display_settings (context, show_images_default) VALUES
  ('inventory', TRUE),
  ('catalogue', TRUE),
  ('vip_portal', TRUE);
```

## 5. UI/UX Specification

### 5.1 Wireframe - With Images Toggle

```
┌─────────────────────────────────────────────────────────────┐
│ Inventory Browser                                           │
│ [Search...] [Category ▼] [Status ▼]        [Columns] [🖼️]   │
│                                              ↑ Image toggle │
├─────────────────────────────────────────────────────────────┤
│ IMG  │ Product       │ Farmer     │ COGS   │ Retail │ Avail │
├─────────────────────────────────────────────────────────────┤
│ [📷] │ Blue Dream    │ Green Thumb│ $100   │ $130   │   25  │
│ [📷] │ OG Kush       │ Valley Farm│ $95    │ $123   │    8  │
│ [📦] │ Live Resin    │ Extract Co.│ $150   │ $210   │   50  │ ← placeholder
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Wireframe - Without Images (Toggle Off)

```
┌─────────────────────────────────────────────────────────────┐
│ Inventory Browser                                           │
│ [Search...] [Category ▼] [Status ▼]        [Columns] [🚫🖼️]  │
│                                              ↑ Toggle off   │
├─────────────────────────────────────────────────────────────┤
│ Product       │ Farmer     │ COGS   │ Retail │ Avail │ Days │
├─────────────────────────────────────────────────────────────┤
│ Blue Dream    │ Green Thumb│ $100   │ $130   │   25  │  45  │
│ OG Kush       │ Valley Farm│ $95    │ $123   │    8  │  12  │
│ Live Resin    │ Extract Co.│ $150   │ $210   │   50  │   8  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Acceptance Criteria

- [ ] Image toggle button visible in toolbar
- [ ] Toggle state persists across page navigation
- [ ] Toggle state persists across sessions (localStorage)
- [ ] Images lazy load when scrolling
- [ ] Placeholder shown for missing images
- [ ] Table adjusts layout when images hidden
- [ ] VIP portal has independent toggle
- [ ] Admin can set default visibility per context

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Image URL returns 404 | Show placeholder icon |
| Slow image loading | Show skeleton, lazy load |
| Many images on page | Lazy load only visible |
| Mobile view | Smaller image size |

## 7. Testing Requirements

### 7.1 Unit Tests
- [ ] Hook persists state correctly
- [ ] Toggle button updates state
- [ ] Lazy loading triggers correctly

### 7.2 Integration Tests
- [ ] Images show/hide across page navigation
- [ ] State persists after refresh

### 7.3 E2E Tests
- [ ] Full toggle workflow
- [ ] VIP portal toggle independent

## 8. Performance Considerations

- Lazy loading reduces initial load
- Placeholder prevents layout shift
- LocalStorage avoids API calls for preference
- Image URLs should use CDN with resize parameters

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
