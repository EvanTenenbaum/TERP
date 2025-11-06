# Live Catalog API Contract

**Version:** 1.0  
**Last Updated:** November 06, 2025  
**Status:** Draft

---

## Overview

This document defines the complete tRPC API contract for the Live Catalog feature. This contract serves as the interface specification between frontend and backend, allowing for parallel development.

---

## Admin Router (`vipPortalAdmin.liveCatalog`)

### Configuration Endpoints

#### `saveConfiguration`

**Type:** Mutation  
**Access:** Admin only

**Input:**
```typescript
{
  clientId: number;
  enabled: boolean;
  visibleCategories?: number[];
  visibleSubcategories?: number[];
  visibleItems?: number[];
  hiddenItems?: number[];
  showQuantity?: boolean;
  showBrand?: boolean;
  showGrade?: boolean;
  showDate?: boolean;
  showBasePrice?: boolean;
  showMarkup?: boolean;
  enablePriceAlerts?: boolean;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Errors:**
- `NOT_FOUND`: Client does not exist
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `getConfiguration`

**Type:** Query  
**Access:** Admin only

**Input:**
```typescript
{
  clientId: number;
}
```

**Output:**
```typescript
{
  id: number;
  clientId: number;
  moduleLiveCatalogEnabled: boolean;
  featuresConfig: {
    liveCatalog?: {
      visibleCategories?: number[];
      visibleSubcategories?: number[];
      visibleItems?: number[];
      hiddenItems?: number[];
      showQuantity?: boolean;
      showBrand?: boolean;
      showGrade?: boolean;
      showDate?: boolean;
      showBasePrice?: boolean;
      showMarkup?: boolean;
      enablePriceAlerts?: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
} | null
```

**Errors:**
- `INTERNAL_SERVER_ERROR`: Database error

---

### Interest Lists Management

#### `interestLists.getByClient`

**Type:** Query  
**Access:** Admin only

**Input:**
```typescript
{
  clientId: number;
  status?: 'NEW' | 'REVIEWED' | 'CONVERTED' | 'ARCHIVED';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  lists: Array<{
    id: number;
    clientId: number;
    submittedAt: Date;
    status: 'NEW' | 'REVIEWED' | 'CONVERTED' | 'ARCHIVED';
    totalItems: number;
    totalValue: string; // decimal as string
    reviewedAt?: Date;
    reviewedBy?: number;
    convertedToOrderId?: number;
    convertedAt?: Date;
    convertedBy?: number;
    notes?: string;
  }>;
  total: number;
}
```

**Errors:**
- `NOT_FOUND`: Client does not exist
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `interestLists.getById`

**Type:** Query  
**Access:** Admin only

**Input:**
```typescript
{
  listId: number;
}
```

**Output:**
```typescript
{
  id: number;
  clientId: number;
  submittedAt: Date;
  status: 'NEW' | 'REVIEWED' | 'CONVERTED' | 'ARCHIVED';
  totalItems: number;
  totalValue: string;
  reviewedAt?: Date;
  reviewedBy?: number;
  convertedToOrderId?: number;
  convertedAt?: Date;
  convertedBy?: number;
  notes?: string;
  items: Array<{
    id: number;
    batchId: number;
    itemName: string;
    category?: string;
    subcategory?: string;
    priceAtInterest: string;
    quantityAtInterest?: string;
    // Current state (for change detection)
    currentPrice?: string;
    currentQuantity?: string;
    currentlyAvailable: boolean;
    priceChanged: boolean;
    quantityChanged: boolean;
  }>;
}
```

**Errors:**
- `NOT_FOUND`: Interest list does not exist
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `interestLists.updateStatus`

**Type:** Mutation  
**Access:** Admin only

**Input:**
```typescript
{
  listId: number;
  status: 'NEW' | 'REVIEWED' | 'CONVERTED' | 'ARCHIVED';
  notes?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Errors:**
- `NOT_FOUND`: Interest list does not exist
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `interestLists.addToNewOrder`

**Type:** Mutation  
**Access:** Admin only

**Input:**
```typescript
{
  listId: number;
  itemIds: number[]; // IDs from clientInterestListItems
}
```

**Output:**
```typescript
{
  success: boolean;
  orderId: number;
}
```

**Validation:**
- All items must belong to the specified interest list
- Items must still be available in inventory
- Creates a new draft order with the selected items

**Errors:**
- `NOT_FOUND`: Interest list does not exist
- `BAD_REQUEST`: Invalid item IDs or items not available
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `interestLists.addToDraftOrder`

**Type:** Mutation  
**Access:** Admin only

**Input:**
```typescript
{
  listId: number;
  orderId: number;
  itemIds: number[];
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Validation:**
- Draft order must belong to the same client as the interest list
- Order status must be 'DRAFT'
- Adding items must not oversell available inventory
- All items must belong to the specified interest list

**Errors:**
- `NOT_FOUND`: Interest list or order does not exist
- `BAD_REQUEST`: Order is not a draft, belongs to different client, or items not available
- `INTERNAL_SERVER_ERROR`: Database error

---

### Draft Interests (Admin View)

#### `draftInterests.getByClient`

**Type:** Query  
**Access:** Admin only

**Input:**
```typescript
{
  clientId: number;
}
```

**Output:**
```typescript
{
  items: Array<{
    id: number;
    batchId: number;
    itemName: string;
    category?: string;
    subcategory?: string;
    currentPrice: string;
    currentQuantity?: string;
    addedAt: Date;
  }>;
  totalItems: number;
  totalValue: string;
}
```

**Errors:**
- `NOT_FOUND`: Client does not exist
- `INTERNAL_SERVER_ERROR`: Database error

---

## Client Router (`vipPortal.liveCatalog`)

### Catalog Browsing

#### `get`

**Type:** Query  
**Access:** Authenticated VIP portal user

**Input:**
```typescript
{
  category?: string;
  brand?: string[];
  grade?: string[];
  stockLevel?: 'all' | 'in_stock' | 'low_stock';
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'category' | 'date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

**Output:**
```typescript
{
  items: Array<{
    batchId: number;
    itemName: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    grade?: string;
    date?: Date;
    retailPrice: string; // Personalized price for this client
    basePrice?: string; // Only if showBasePrice is enabled
    markup?: string; // Only if showMarkup is enabled
    quantity?: string; // Only if showQuantity is enabled
    stockLevel: 'in_stock' | 'low_stock' | 'out_of_stock';
    inDraft: boolean; // Whether this item is in the client's draft
  }>;
  total: number;
  appliedFilters: {
    category?: string;
    brand?: string[];
    grade?: string[];
    stockLevel?: string;
    priceMin?: number;
    priceMax?: number;
    search?: string;
  };
}
```

**Business Logic:**
- Uses `salesSheetsDb.getInventoryWithPricing` to ensure pricing consistency
- Filters items based on client's visibility configuration
- Applies client-specific pricing rules
- Returns empty array if Live Catalog is disabled for this client

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `getFilterOptions`

**Type:** Query  
**Access:** Authenticated VIP portal user

**Input:** None (uses client from context)

**Output:**
```typescript
{
  categories: Array<{ id: number; name: string; }>;
  brands: string[];
  grades: string[];
  priceRange: {
    min: number;
    max: number;
  };
}
```

**Business Logic:**
- Returns only the filter options available to this client based on their visibility configuration
- Dynamically calculated from the client's visible inventory

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `INTERNAL_SERVER_ERROR`: Database error

---

### Draft Management

#### `getDraftInterests`

**Type:** Query  
**Access:** Authenticated VIP portal user

**Input:** None (uses client from context)

**Output:**
```typescript
{
  items: Array<{
    id: number;
    batchId: number;
    itemName: string;
    category?: string;
    subcategory?: string;
    retailPrice: string;
    quantity?: string;
    addedAt: Date;
    // Change detection
    priceChanged: boolean;
    priceAtAdd?: string; // Original price when added
    quantityChanged: boolean;
    quantityAtAdd?: string; // Original quantity when added
    stillAvailable: boolean;
  }>;
  totalItems: number;
  totalValue: string;
  hasChanges: boolean; // True if any items have changed
}
```

**Business Logic:**
- Compares current inventory state with state when items were added to draft
- Flags price changes, quantity changes, and availability changes

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `addToDraft`

**Type:** Mutation  
**Access:** Authenticated VIP portal user

**Input:**
```typescript
{
  batchId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
  draftId: number;
}
```

**Business Logic:**
- Adds item to client's draft interest list
- Prevents duplicates (returns existing draft ID if already added)
- Auto-saves to database

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `NOT_FOUND`: Batch does not exist or is not visible to this client
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `removeFromDraft`

**Type:** Mutation  
**Access:** Authenticated VIP portal user

**Input:**
```typescript
{
  draftId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Validation:**
- Draft item must belong to the authenticated client

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `NOT_FOUND`: Draft item does not exist
- `FORBIDDEN`: Draft item belongs to a different client
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `clearDraft`

**Type:** Mutation  
**Access:** Authenticated VIP portal user

**Input:** None (uses client from context)

**Output:**
```typescript
{
  success: boolean;
  itemsCleared: number;
}
```

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `submitInterestList`

**Type:** Mutation  
**Access:** Authenticated VIP portal user

**Input:** None (uses client from context)

**Output:**
```typescript
{
  success: boolean;
  interestListId: number;
  totalItems: number;
  totalValue: string;
}
```

**Business Logic:**
- Creates a snapshot of the current draft as a submitted interest list
- Clears the draft after successful submission
- Captures current prices and quantities as "at interest" values
- Sets status to 'NEW'

**Validation:**
- Draft must not be empty

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `BAD_REQUEST`: Draft is empty
- `INTERNAL_SERVER_ERROR`: Database error

---

### Saved Views

#### `views.list`

**Type:** Query  
**Access:** Authenticated VIP portal user

**Input:** None (uses client from context)

**Output:**
```typescript
{
  views: Array<{
    id: number;
    name: string;
    filters: {
      category?: string | null;
      brand?: string[];
      grade?: string[];
      stockLevel?: 'all' | 'in_stock' | 'low_stock';
      priceMin?: number;
      priceMax?: number;
      search?: string;
    };
    createdAt: Date;
    updatedAt: Date;
  }>;
}
```

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `views.save`

**Type:** Mutation  
**Access:** Authenticated VIP portal user

**Input:**
```typescript
{
  name: string; // Max 100 characters
  filters: {
    category?: string | null;
    brand?: string[];
    grade?: string[];
    stockLevel?: 'all' | 'in_stock' | 'low_stock';
    priceMin?: number;
    priceMax?: number;
    search?: string;
  };
}
```

**Output:**
```typescript
{
  success: boolean;
  viewId: number;
}
```

**Validation:**
- Name must be unique per client
- Name must not be empty

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `BAD_REQUEST`: Name is empty or already exists
- `INTERNAL_SERVER_ERROR`: Database error

---

#### `views.delete`

**Type:** Mutation  
**Access:** Authenticated VIP portal user

**Input:**
```typescript
{
  viewId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Validation:**
- View must belong to the authenticated client

**Errors:**
- `UNAUTHORIZED`: User is not authenticated
- `NOT_FOUND`: View does not exist
- `FORBIDDEN`: View belongs to a different client
- `INTERNAL_SERVER_ERROR`: Database error

---

## Data Flow

### Catalog Browsing Flow

```
Client Request
  ↓
vipPortal.liveCatalog.get
  ↓
Get client configuration
  ↓
salesSheetsDb.getInventoryWithPricing (reused function)
  ↓
Apply visibility filters
  ↓
Apply user filters (category, price, etc.)
  ↓
Return filtered inventory with personalized pricing
```

### Interest List Submission Flow

```
Client has draft items
  ↓
vipPortal.liveCatalog.submitInterestList
  ↓
Start transaction
  ↓
Create clientInterestLists record
  ↓
For each draft item:
  - Get current price/quantity
  - Create clientInterestListItems record with snapshot
  ↓
Delete all draft items
  ↓
Commit transaction
  ↓
Return success with list ID
```

### Add to Order Flow (Admin)

```
Admin views interest list
  ↓
Admin selects items to add
  ↓
vipPortalAdmin.liveCatalog.interestLists.addToDraftOrder
  ↓
Validate:
  - Order belongs to same client
  - Order is still in DRAFT status
  - Items won't oversell inventory
  ↓
For each selected item:
  - Get current batch info
  - Add to order with current price
  ↓
Update interest list status to CONVERTED
  ↓
Return success
```

---

## Error Handling

All endpoints follow standard tRPC error handling:

- `UNAUTHORIZED`: User is not authenticated or lacks permissions
- `FORBIDDEN`: User is authenticated but not authorized for this resource
- `NOT_FOUND`: Requested resource does not exist
- `BAD_REQUEST`: Invalid input or business logic violation
- `INTERNAL_SERVER_ERROR`: Database or server error

---

## Performance Considerations

- **Catalog queries:** Use existing optimized `getInventoryWithPricing` function
- **Draft operations:** Single-row inserts/deletes, very fast
- **Interest list submission:** Uses database transaction for atomicity
- **Change detection:** Computed on-the-fly, no stored state needed

---

## Security Considerations

- All client-facing endpoints verify the authenticated client ID from context
- Admin endpoints require admin authentication
- Cross-client data access is prevented through client ID filtering
- Draft items and interest lists are isolated per client

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 06, 2025 | Initial API contract |
