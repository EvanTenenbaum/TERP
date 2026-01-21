# DATA-021: Mock Product Image Seeding for Live Catalog Testing

## Problem Statement

The live catalog and VIP portal shipping features cannot be properly tested because products lack images. The current state shows placeholder emojis (🌿) instead of actual product images, making it impossible to:

1. Test the live catalog visual experience
2. Verify image loading/error handling
3. Test the VIP portal shopping experience
4. Demo the product to stakeholders

## Current Infrastructure

### Database Tables

1. **`productMedia`** - Primary table for catalog images
   - Used by live catalog service (`liveCatalogService.ts:182-209`)
   - Fields: `productId`, `url`, `type`, `filename`, `size`, `uploadedBy`

2. **`productImages`** - Batch-specific photography workflow
   - Used by photography module
   - Fields: `batchId`, `productId`, `imageUrl`, `thumbnailUrl`, `isPrimary`, `status`

### Existing Seed Scripts

- `scripts/seed/seeders/seed-product-media.ts` - Basic seeding with picsum.photos
- `scripts/seed/seeders/seed-product-media-realistic.ts` - Category keywords with loremflickr

### Issues with Current Scripts

1. Loremflickr with cannabis keywords often returns no results or inappropriate images
2. No verification that image URLs are accessible
3. No batch-level images for inventory display
4. No fallback if image service is unavailable
5. Scripts exit if any records exist (not idempotent)

---

## Recommended Strategy

### Phase 1: Identify Reliable Free Image Sources

| Source              | URL Pattern                                                             | Pros                          | Cons                 | Use Case             |
| ------------------- | ----------------------------------------------------------------------- | ----------------------------- | -------------------- | -------------------- |
| **Picsum Photos**   | `https://picsum.photos/seed/{seed}/{width}/{height}`                    | Deterministic, fast, reliable | Generic images       | Default fallback     |
| **Unsplash Source** | `https://source.unsplash.com/{width}x{height}/?{keywords}`              | High quality, keyword search  | Rate limited, slower | Category-specific    |
| **PlaceHolder.com** | `https://via.placeholder.com/{width}x{height}/{bg}/{text}?text={label}` | Guaranteed availability       | Text only, no photos | Offline/fallback     |
| **Lorem Picsum**    | `https://picsum.photos/id/{id}/{width}/{height}`                        | Specific image IDs            | Limited variety      | Consistent demos     |
| **DummyImage**      | `https://dummyimage.com/{width}x{height}/{bg}/{fg}&text={text}`         | Customizable colors           | No photos            | Branded placeholders |

### Phase 2: Category-Specific Image Strategy

Since cannabis product images aren't available from free sources, use **visually similar** categories:

| Product Category | Unsplash Keywords                      | Picsum Seed Prefix | Placeholder Color        |
| ---------------- | -------------------------------------- | ------------------ | ------------------------ |
| **Flower**       | `nature,botanical,green,plant,herb`    | `flower-`          | `#228B22` (ForestGreen)  |
| **Concentrates** | `amber,honey,gold,crystal,glass`       | `concentrate-`     | `#FFD700` (Gold)         |
| **Edibles**      | `candy,gummy,chocolate,treat,food`     | `edible-`          | `#FF69B4` (HotPink)      |
| **PreRolls**     | `paper,texture,natural,craft,roll`     | `preroll-`         | `#DEB887` (BurlyWood)    |
| **Vapes**        | `technology,device,modern,sleek,metal` | `vape-`            | `#4169E1` (RoyalBlue)    |
| **Tinctures**    | `bottle,glass,dropper,medicine,oil`    | `tincture-`        | `#9370DB` (MediumPurple) |
| **Topicals**     | `cream,lotion,jar,skincare,wellness`   | `topical-`         | `#F5DEB3` (Wheat)        |

### Phase 3: Implementation Plan

#### 3.1 Create Enhanced Seed Script

**File:** `scripts/seed/seeders/seed-product-media-v2.ts`

```typescript
// Features:
// 1. Multi-source fallback chain
// 2. URL accessibility verification
// 3. Category-specific images
// 4. Batch and product-level images
// 5. Idempotent (upsert logic)
// 6. Progress tracking with ETA
// 7. Dry-run mode for testing
// 8. Parallel insertion for performance
```

**Image Resolution Strategy:**

1. Try Unsplash Source with category keywords
2. Fallback to Picsum with deterministic seed
3. Final fallback to branded placeholder

#### 3.2 Create Batch Image Seeder

**File:** `scripts/seed/seeders/seed-batch-images.ts`

Seeds `productImages` table for batch-level photography:

- Primary image per batch
- Status: APPROVED (for testing)
- Links to product for catalog display

#### 3.3 URL Verification Utility

```typescript
async function verifyImageUrl(url: string, timeout = 5000): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeout),
    });
    return (
      response.ok && response.headers.get("content-type")?.startsWith("image/")
    );
  } catch {
    return false;
  }
}
```

### Phase 4: Execution Commands

```bash
# Seed product images (productMedia table)
npx tsx scripts/seed/seeders/seed-product-media-v2.ts

# Seed batch images (productImages table)
npx tsx scripts/seed/seeders/seed-batch-images.ts

# Combined seeding with verification
npx tsx scripts/seed/seeders/seed-all-images.ts --verify

# Dry run (show what would be inserted)
npx tsx scripts/seed/seeders/seed-all-images.ts --dry-run

# Force re-seed (delete existing and re-insert)
npx tsx scripts/seed/seeders/seed-all-images.ts --force
```

### Phase 5: Verification Checklist

- [ ] Run seed script successfully
- [ ] Verify images display in live catalog
- [ ] Verify images display in VIP portal
- [ ] Verify fallback placeholder works on load error
- [ ] Test with different categories
- [ ] Verify batch images in inventory view
- [ ] Test photography module with seeded images

---

## Technical Specification

### Image URLs to Generate

For each **product** in `products` table:

1. Insert 1-3 records into `productMedia` (based on category)
2. URL format: `https://picsum.photos/seed/terp-{productId}-{index}/400/400`

For each **batch** in `batches` table:

1. Insert 1 record into `productImages` with `isPrimary=true`
2. URL format: `https://picsum.photos/seed/batch-{batchId}/400/400`

### Database Queries

```sql
-- Count products needing images
SELECT COUNT(*) FROM products p
LEFT JOIN productMedia pm ON p.id = pm.productId
WHERE pm.id IS NULL AND p.deleted_at IS NULL;

-- Count batches needing images
SELECT COUNT(*) FROM batches b
LEFT JOIN product_images pi ON b.id = pi.batch_id
WHERE pi.id IS NULL;

-- Verify seeding
SELECT
  (SELECT COUNT(*) FROM productMedia) as product_images,
  (SELECT COUNT(*) FROM product_images) as batch_images,
  (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) as total_products,
  (SELECT COUNT(*) FROM batches) as total_batches;
```

---

## Deliverables

1. **Enhanced seed script** (`seed-product-media-v2.ts`)
   - Multi-source image URLs with fallback
   - Category-specific images
   - URL verification before insert
   - Idempotent operation

2. **Batch image seeder** (`seed-batch-images.ts`)
   - Seeds `productImages` table
   - Links batches to primary images
   - Approved status for immediate display

3. **Combined runner** (`seed-all-images.ts`)
   - Orchestrates both seeders
   - Progress reporting
   - Dry-run mode

4. **Documentation update**
   - Add to seeding README
   - Update QA playbook

---

## Estimated Effort

| Task                              | Estimate |
| --------------------------------- | -------- |
| Research and verify image sources | 1h       |
| Create `seed-product-media-v2.ts` | 2h       |
| Create `seed-batch-images.ts`     | 1h       |
| Create combined runner            | 30min    |
| Testing and verification          | 1h       |
| Documentation                     | 30min    |
| **Total**                         | **6h**   |

---

## Dependencies

- Database access with write permissions
- Network access to image services (picsum.photos, unsplash)
- Existing products and batches in database

## Related Tasks

- LIVE-001: Live Shopping session console (needs images to test)
- WS-010A: Photography module integration
- VIP Portal testing

## Success Criteria

1. ≥95% of products have at least one image in `productMedia`
2. ≥90% of batches have a primary image in `productImages`
3. Live catalog displays images instead of placeholders
4. VIP portal shopping experience is fully visual
5. No broken image links (all URLs verified)
