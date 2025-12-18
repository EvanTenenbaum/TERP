# Design Document

## Overview

This design completes the vendor-to-client migration by updating the backend `vendors` router to use the canonical `clients` table, enhancing the frontend to display supplier information within client profiles, and consolidating navigation to eliminate the separate Vendors section.

## Architecture

### Current State (Problematic)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  VendorsPage ──► vendors router ──► vendors table (DEPRECATED)          │
│                                                                          │
│  ClientsListPage ──► clients router ──► clients table (CANONICAL)       │
│                                              │                           │
│                                              ▼                           │
│                                       supplier_profiles                  │
│                                                                          │
│  PurchaseOrdersPage ──► purchaseOrders router                           │
│       └──► vendorId → vendors.id (DEPRECATED FK)                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Target State (Unified)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  /vendors/* routes ──► REDIRECT ──► /clients/*                          │
│                                                                          │
│  ClientsListPage ──► clients router ──► clients table                   │
│       │                                      │                           │
│       │ (filter: isSeller=true)              ▼                           │
│       │                               supplier_profiles                  │
│       │                                                                  │
│  ClientProfilePage ──► shows supplier section when isSeller=true        │
│                                                                          │
│  PurchaseOrdersPage ──► clients router (seller filter)                  │
│       └──► supplierClientId → clients.id (CANONICAL FK)                 │
│                                                                          │
│  vendors router ──► FACADE over clients table (backward compat)         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend Components

#### 1. Updated `inventoryDb.ts` Functions

```typescript
// server/inventoryDb.ts

/**
 * Get all suppliers (clients with isSeller=true)
 * Replaces deprecated getAllVendors()
 */
export async function getAllSuppliers(): Promise<SupplierWithProfile[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.query.clients.findMany({
    where: eq(clients.isSeller, true),
    with: { supplierProfile: true },
    orderBy: [asc(clients.name)]
  });
}

/**
 * Get supplier by client ID
 */
export async function getSupplierByClientId(clientId: number): Promise<SupplierWithProfile | null> {
  const db = await getDb();
  if (!db) return null;
  
  return await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.isSeller, true)),
    with: { supplierProfile: true }
  });
}

/**
 * Get supplier by legacy vendor ID (for backward compatibility)
 */
export async function getSupplierByLegacyVendorId(vendorId: number): Promise<SupplierWithProfile | null> {
  const db = await getDb();
  if (!db) return null;
  
  const profile = await db.query.supplierProfiles.findFirst({
    where: eq(supplierProfiles.legacyVendorId, vendorId),
    with: { client: true }
  });
  
  if (!profile) return null;
  return { ...profile.client, supplierProfile: profile };
}
```

#### 2. Updated `vendors` Router (Facade)

```typescript
// server/routers/vendors.ts

export const vendorsRouter = router({
  getAll: publicProcedure.query(async () => {
    console.warn('[DEPRECATED] vendors.getAll - use clients.list with seller filter');
    const suppliers = await inventoryDb.getAllSuppliers();
    // Transform to legacy vendor format for backward compatibility
    return {
      success: true,
      data: suppliers.map(s => ({
        id: s.supplierProfile?.legacyVendorId ?? s.id,
        name: s.name,
        contactName: s.supplierProfile?.contactName,
        contactEmail: s.supplierProfile?.contactEmail,
        contactPhone: s.supplierProfile?.contactPhone,
        paymentTerms: s.supplierProfile?.paymentTerms,
        notes: s.supplierProfile?.supplierNotes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        // Include clientId for migration
        _clientId: s.id
      }))
    };
  }),
  
  create: publicProcedure
    .input(createVendorSchema)
    .mutation(async ({ input }) => {
      // Create client with isSeller=true
      const clientId = await clientsDb.createClient({
        name: input.name,
        isSeller: true,
        isBuyer: false
      });
      
      // Create supplier profile
      await supplierProfileService.createProfile({
        clientId,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        paymentTerms: input.paymentTerms,
        supplierNotes: input.notes
      });
      
      return { success: true, data: { id: clientId } };
    }),
  
  // ... similar updates for update, delete, getNotes, etc.
});
```

#### 3. Updated `purchaseOrders` Router

```typescript
// server/routers/purchaseOrders.ts

// Add supplierClientId to create input
const createPOInput = z.object({
  supplierClientId: z.number(), // New canonical field
  vendorId: z.number().optional(), // Legacy, for backward compat
  // ... other fields
});

// In create mutation
create: protectedProcedure
  .input(createPOInput)
  .mutation(async ({ input }) => {
    let supplierClientId = input.supplierClientId;
    
    // Backward compatibility: resolve vendorId to clientId
    if (!supplierClientId && input.vendorId) {
      const supplier = await inventoryDb.getSupplierByLegacyVendorId(input.vendorId);
      if (!supplier) throw new TRPCError({ code: 'NOT_FOUND', message: 'Supplier not found' });
      supplierClientId = supplier.id;
    }
    
    // Create PO with supplierClientId
    // ...
  })
```

### Frontend Components

#### 1. ClientProfilePage Supplier Section

```typescript
// client/src/components/clients/SupplierProfileSection.tsx

interface SupplierProfileSectionProps {
  clientId: number;
  supplierProfile: SupplierProfile | null;
  onEdit: () => void;
}

export function SupplierProfileSection({ clientId, supplierProfile, onEdit }: SupplierProfileSectionProps) {
  const { data: purchaseOrders } = trpc.purchaseOrders.getBySupplier.useQuery({ supplierClientId: clientId });
  const { data: batches } = trpc.inventory.getBatchesBySupplier.useQuery({ supplierClientId: clientId });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier Information</CardTitle>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Payment Terms</Label>
            <div>{supplierProfile?.paymentTerms || 'Not set'}</div>
          </div>
          <div>
            <Label>License Number</Label>
            <div>{supplierProfile?.licenseNumber || 'Not set'}</div>
          </div>
          <div>
            <Label>Preferred Payment</Label>
            <div>{supplierProfile?.preferredPaymentMethod || 'Not set'}</div>
          </div>
        </div>
        
        {/* Purchase Orders Summary */}
        <div className="mt-6">
          <h4>Recent Purchase Orders ({purchaseOrders?.length || 0})</h4>
          {/* PO list */}
        </div>
        
        {/* Products Supplied */}
        <div className="mt-6">
          <h4>Products Supplied ({batches?.length || 0})</h4>
          {/* Batch list */}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 2. Updated ClientsListPage with Supplier Filter

```typescript
// In ClientsListPage.tsx

const defaultViews: FilterView[] = [
  { id: 'all', name: 'All Clients', search: '', clientTypes: [], hasDebt: undefined },
  { id: 'buyers', name: 'Buyers', search: '', clientTypes: ['buyer'], hasDebt: undefined },
  { id: 'suppliers', name: 'Suppliers', search: '', clientTypes: ['seller'], hasDebt: undefined }, // Renamed from "Sellers Only"
  { id: 'debt', name: 'With Outstanding Balance', search: '', clientTypes: [], hasDebt: true },
];

// Add "Add Supplier" button when on suppliers filter
{clientTypes.includes('seller') && (
  <Button onClick={() => setAddClientOpen(true, { isSeller: true })}>
    <Plus className="h-4 w-4 mr-2" />
    Add Supplier
  </Button>
)}
```

#### 3. Route Redirects

```typescript
// client/src/App.tsx

import { Redirect } from "wouter";

// In routes
<Route path="/vendors">
  <Redirect to="/clients?clientTypes=seller" />
</Route>

<Route path="/vendors/:id">
  {({ id }) => <VendorRedirect vendorId={parseInt(id)} />}
</Route>

// VendorRedirect component
function VendorRedirect({ vendorId }: { vendorId: number }) {
  const { data } = trpc.vendors.getById.useQuery({ id: vendorId });
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (data?.data?._clientId) {
      setLocation(`/clients/${data.data._clientId}`);
    }
  }, [data]);
  
  return <div>Redirecting...</div>;
}
```

#### 4. Updated PurchaseOrdersPage

```typescript
// client/src/pages/PurchaseOrdersPage.tsx

// Replace vendors query with clients query
const { data: suppliers } = trpc.clients.list.useQuery({
  clientTypes: ['seller'],
  limit: 1000
});

// Update form
<div>
  <Label htmlFor="supplier">Supplier *</Label>
  <Select
    value={formData.supplierClientId}
    onValueChange={value => setFormData({ ...formData, supplierClientId: value })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select supplier" />
    </SelectTrigger>
    <SelectContent>
      {suppliers?.map(supplier => (
        <SelectItem key={supplier.id} value={supplier.id.toString()}>
          {supplier.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

## Data Models

### SupplierWithProfile Type

```typescript
interface SupplierWithProfile {
  id: number;
  name: string;
  teriCode: string;
  isSeller: true;
  isBuyer: boolean;
  createdAt: Date;
  updatedAt: Date;
  supplierProfile: {
    id: number;
    clientId: number;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    paymentTerms: string | null;
    supplierNotes: string | null;
    legacyVendorId: number | null;
    preferredPaymentMethod: string | null;
    taxId: string | null;
    licenseNumber: string | null;
  } | null;
}
```

### Database Schema Updates

```sql
-- Add supplier_client_id to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN supplier_client_id INT;
ALTER TABLE purchase_orders ADD INDEX idx_po_supplier_client_id (supplier_client_id);

-- Backfill from vendor_id
UPDATE purchase_orders po
JOIN supplier_profiles sp ON sp.legacy_vendor_id = po.vendor_id
SET po.supplier_client_id = sp.client_id
WHERE po.supplier_client_id IS NULL AND po.vendor_id IS NOT NULL;

-- Create client_notes table (if not exists)
CREATE TABLE IF NOT EXISTS client_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  user_id INT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_client_notes_client_id (client_id)
);

-- Migrate vendor_notes to client_notes
INSERT INTO client_notes (client_id, user_id, note, created_at, updated_at)
SELECT sp.client_id, vn.user_id, vn.note, vn.created_at, vn.updated_at
FROM vendor_notes vn
JOIN supplier_profiles sp ON sp.legacy_vendor_id = vn.vendor_id;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Supplier Data Consistency
*For any* supplier created via the vendors router, the corresponding client record SHALL have `isSeller=true` and a linked supplier_profile record.
**Validates: Requirements 1.2**

### Property 2: Legacy Vendor ID Resolution
*For any* legacy vendorId, if a supplier_profile exists with that legacyVendorId, the system SHALL resolve it to the correct clientId.
**Validates: Requirements 6.1**

### Property 3: Purchase Order Supplier Reference Integrity
*For any* purchase order with a supplierClientId, that ID SHALL reference a valid client record with `isSeller=true`.
**Validates: Requirements 2.1**

### Property 4: Route Redirect Correctness
*For any* navigation to /vendors/:id, the system SHALL redirect to /clients/:clientId where clientId is the mapped client for that vendor.
**Validates: Requirements 4.2**

### Property 5: Supplier Filter Completeness
*For any* client with `isSeller=true`, that client SHALL appear in the suppliers filter view.
**Validates: Requirements 4.4**

## Error Handling

### Legacy Vendor Not Found
When a legacy vendorId cannot be resolved:
- Log warning with vendorId
- Return appropriate error to user
- Do not create orphaned records

### Supplier Profile Missing
When a client has `isSeller=true` but no supplier_profile:
- Create supplier_profile on-demand with default values
- Log for data cleanup

### Redirect Loop Prevention
When redirecting /vendors/:id:
- If mapping fails, redirect to /clients with error toast
- Do not loop back to /vendors

## Testing Strategy

### Unit Tests
- `inventoryDb.getAllSuppliers()` returns only clients with isSeller=true
- `inventoryDb.getSupplierByLegacyVendorId()` correctly resolves mapping
- Vendor router facade transforms data correctly

### Integration Tests
- Create supplier via vendors router → verify client + supplier_profile created
- Create PO with supplierClientId → verify FK integrity
- Navigate to /vendors/:id → verify redirect to correct client

### Property-Based Tests
- Generate random suppliers, verify all appear in getAllSuppliers()
- Generate random legacy vendorIds, verify resolution or appropriate error
- Generate random POs, verify supplierClientId always valid

### E2E Tests
- User creates supplier from Clients page → appears in PO dropdown
- User navigates to old vendor URL → redirected to client profile
- User creates PO → supplier correctly linked
