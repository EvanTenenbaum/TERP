# Specification: WS-010 - Photography Module

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 16h  
**Module:** Photography (New Module)  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

Product photography is a critical part of the sales process, but currently there's no centralized way to:

1. Upload and organize product photos
2. Link photos to specific batches/products
3. Track which products need photography
4. Manage photo quality and approval

The business needs a simple, dedicated module to streamline the photography workflow without overcomplicating the core inventory system.

## 2. User Stories

1. **As a photographer**, I want a simple interface to upload photos and link them to products, so that I can efficiently process my photo queue.

2. **As a sales person**, I want to see product photos when creating orders, so that I can show customers what's available.

3. **As a manager**, I want to see which products are missing photos, so that I can prioritize photography work.

4. **As a staff member**, I want to mark photos as "primary" for each product, so that the best photo shows in listings.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Upload photos (drag-and-drop, multi-select) | Must Have |
| FR-02 | Link photos to batches/products | Must Have |
| FR-03 | View all photos for a product/batch | Must Have |
| FR-04 | Set primary photo for product | Must Have |
| FR-05 | "Needs Photo" queue/dashboard | Must Have |
| FR-06 | Delete/replace photos | Must Have |
| FR-07 | Photo approval workflow | Should Have |
| FR-08 | Bulk upload with auto-matching | Should Have |
| FR-09 | Image optimization (resize, compress) | Should Have |
| FR-10 | Photo tags/categories | Nice to Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Each batch can have multiple photos | Gallery view |
| BR-02 | One photo designated as "primary" | Shows in listings |
| BR-03 | Photos auto-linked to product when linked to batch | Inheritance |
| BR-04 | Supported formats: JPG, PNG, WEBP | Standard web formats |
| BR-05 | Max file size: 10MB per photo | Performance |
| BR-06 | Photos stored in cloud storage (S3) | Scalability |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- Product photos table
CREATE TABLE product_photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT REFERENCES batches(id),
  product_id INT REFERENCES products(id),
  
  -- File info
  original_filename VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL, -- S3 key
  storage_url VARCHAR(500) NOT NULL, -- Public URL
  thumbnail_url VARCHAR(500), -- Resized thumbnail
  
  -- Metadata
  file_size INT NOT NULL, -- bytes
  width INT,
  height INT,
  mime_type VARCHAR(50) NOT NULL,
  
  -- Status
  is_primary BOOLEAN DEFAULT FALSE,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED',
  rejection_reason TEXT,
  
  -- Audit
  uploaded_by INT NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMP,
  
  INDEX idx_batch_photos (batch_id),
  INDEX idx_product_photos (product_id),
  INDEX idx_primary (product_id, is_primary)
);

-- Track products needing photos
CREATE VIEW products_needing_photos AS
SELECT p.id, p.name, p.category_id, c.name as category_name,
       b.id as batch_id, b.batch_number, b.quantity
FROM products p
JOIN batches b ON b.product_id = p.id
LEFT JOIN product_photos pp ON pp.batch_id = b.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE pp.id IS NULL
  AND b.quantity > 0
  AND b.status = 'AVAILABLE';
```

### 4.2 API Contracts

```typescript
// Upload photo(s)
photos.upload = adminProcedure
  .input(z.object({
    batchId: z.number().optional(),
    productId: z.number().optional(),
    files: z.array(z.object({
      filename: z.string(),
      base64: z.string(), // Or use presigned URL flow
      mimeType: z.string()
    })),
    setAsPrimary: z.boolean().default(false)
  }))
  .output(z.object({
    uploadedPhotos: z.array(z.object({
      id: z.number(),
      url: z.string(),
      thumbnailUrl: z.string()
    })),
    success: z.boolean()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Validate file types and sizes
    // 2. Upload to S3
    // 3. Generate thumbnail
    // 4. Create database records
    // 5. Set as primary if requested
    // 6. Return URLs
  });

// Get presigned upload URL (alternative to base64)
photos.getUploadUrl = adminProcedure
  .input(z.object({
    filename: z.string(),
    mimeType: z.string(),
    batchId: z.number().optional(),
    productId: z.number().optional()
  }))
  .output(z.object({
    uploadUrl: z.string(),
    photoId: z.number(),
    expiresAt: z.date()
  }))
  .mutation(async ({ input }) => {
    // Generate presigned S3 URL for direct upload
  });

// Get photos for batch/product
photos.getPhotos = publicProcedure
  .input(z.object({
    batchId: z.number().optional(),
    productId: z.number().optional(),
    includeRejected: z.boolean().default(false)
  }))
  .output(z.array(z.object({
    id: z.number(),
    url: z.string(),
    thumbnailUrl: z.string(),
    isPrimary: z.boolean(),
    status: z.string(),
    uploadedBy: z.string(),
    uploadedAt: z.date()
  })))
  .query(async ({ input }) => {
    // Return photos for batch or product
  });

// Set primary photo
photos.setPrimary = adminProcedure
  .input(z.object({
    photoId: z.number(),
    productId: z.number()
  }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input }) => {
    // 1. Unset current primary for product
    // 2. Set new primary
  });

// Delete photo
photos.delete = adminProcedure
  .input(z.object({ photoId: z.number() }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input }) => {
    // 1. Delete from S3
    // 2. Delete database record
  });

// Get products needing photos
photos.getNeedsPhotoQueue = adminProcedure
  .input(z.object({
    categoryId: z.number().optional(),
    limit: z.number().default(50)
  }))
  .output(z.array(z.object({
    productId: z.number(),
    productName: z.string(),
    categoryName: z.string(),
    batchId: z.number(),
    batchNumber: z.string(),
    quantity: z.number()
  })))
  .query(async ({ input }) => {
    // Return products/batches without photos
  });

// Approve/reject photo (if approval workflow enabled)
photos.review = adminProcedure
  .input(z.object({
    photoId: z.number(),
    action: z.enum(['APPROVE', 'REJECT']),
    rejectionReason: z.string().optional()
  }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input, ctx }) => {
    // Update photo status
  });
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| S3/Cloud Storage | Write/Read | Store and retrieve photos |
| Batches | Read | Link photos to batches |
| Products | Read | Link photos to products |
| Sales/Orders | Read | Display photos in order flow |
| VIP Portal | Read | Display photos to vendors |

## 5. UI/UX Specification

### 5.1 User Flow: Upload Photos

```
[Navigate to Photography Module]
    → [Click "Upload Photos" or Drag-and-Drop]
    → [Select/Link to Batch or Product]
    → [Preview Uploads]
    → [Confirm Upload]
    → [Set Primary (optional)]
    → [Done]
```

### 5.2 Wireframe: Photography Module Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  📷 Photography                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Upload Photos]                    Search: [____________]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 Needs Photos (12)                        [View All]│   │
│  │                                                     │   │
│  │ • Blue Dream (BD-2024-005) - 25 oz                 │   │
│  │ • OG Kush (OK-2024-012) - 50 oz                    │   │
│  │ • Sour Diesel (SD-2024-003) - 15 oz                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️ Recent Uploads                                   │   │
│  │                                                     │   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │   │
│  │ │     │ │     │ │     │ │     │ │     │           │   │
│  │ │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │           │   │
│  │ │     │ │     │ │     │ │     │ │     │           │   │
│  │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │   │
│  │ BD-001  OK-012  SD-003  GS-007  PH-002            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Wireframe: Upload Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  📷 Upload Photos                                      [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     📁 Drag and drop photos here                   │   │
│  │        or click to browse                          │   │
│  │                                                     │   │
│  │     Supported: JPG, PNG, WEBP (max 10MB)           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Link to: ○ Batch  ● Product                               │
│                                                             │
│  Select: [Search batches/products...        ▼]             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Preview (3 files selected)                          │   │
│  │                                                     │   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐                            │   │
│  │ │ 📷  │ │ 📷  │ │ 📷  │                            │   │
│  │ │ ⭐  │ │     │ │     │  ⭐ = Set as Primary       │   │
│  │ └─────┘ └─────┘ └─────┘                            │   │
│  │ IMG_001 IMG_002 IMG_003                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancel]                              [Upload 3 Photos]    │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Wireframe: Photo Gallery (Batch/Product View)

```
┌─────────────────────────────────────────────────────────────┐
│  🖼️ Photos: Blue Dream (BD-2024-001)          [+ Add Photos]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                 │
│  │           │ │           │ │           │                 │
│  │    📷     │ │    📷     │ │    📷     │                 │
│  │   ⭐      │ │           │ │           │                 │
│  │  PRIMARY  │ │           │ │           │                 │
│  └───────────┘ └───────────┘ └───────────┘                 │
│  [Set Primary] [Set Primary] [Set Primary]                 │
│  [Delete]      [Delete]      [Delete]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Acceptance Criteria (UI)

- [ ] Drag-and-drop upload works
- [ ] Multi-file selection works
- [ ] Preview shows before upload
- [ ] Progress indicator during upload
- [ ] Primary photo clearly marked
- [ ] "Needs Photos" queue shows correct items
- [ ] Photos display in order/sales flow

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| File too large (>10MB) | Validation error before upload |
| Unsupported file type | Validation error, show supported types |
| Upload fails mid-way | Retry option, partial uploads cleaned up |
| Delete primary photo | Next photo becomes primary, or none |
| Batch deleted with photos | Photos orphaned but accessible via product |
| No batch/product selected | Require selection before upload |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] File validation (type, size)
- [ ] Primary photo logic
- [ ] Thumbnail generation
- [ ] S3 upload/delete

### 7.2 Integration Tests

- [ ] Full upload flow
- [ ] Photo retrieval by batch/product
- [ ] "Needs Photos" query accuracy
- [ ] Delete cascade behavior

### 7.3 E2E Tests

- [ ] Upload photos via drag-and-drop
- [ ] Set primary photo
- [ ] View photos in order flow
- [ ] Delete photo

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required. New module with empty tables.

### 8.2 Feature Flag

`FEATURE_PHOTOGRAPHY_MODULE` - Enable for all users.

### 8.3 Rollback Plan

1. Disable feature flag
2. Module hidden from navigation
3. Existing photos preserved in S3
4. Re-enable when issues resolved

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Products with photos | 90%+ | Photo coverage report |
| Time to photograph new batch | <24 hours | Intake → photo time |
| Photo usage in sales | Track views | Analytics |

## 10. Open Questions

- [x] Should we support video? **Defer to future enhancement**
- [x] Should photos be public or require auth? **Public URLs, no auth required**
- [ ] Should we integrate with external photo services? **Future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
