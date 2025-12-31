# Search Router

**Path:** `trpc.search`  
**File:** `server/routers/search.ts`  
**Permission Required:** `clients:read`

---

## Overview

The Search router provides a unified global search capability across quotes, customers, and products. It enables quick navigation and discovery of records from a single search interface.

---

## Endpoints

### global

Search across all entity types (quotes, customers, products) simultaneously.

**Type:** Query  
**Permission:** `clients:read`

**Input:**

```typescript
{
  query: string;   // Required, 1-200 characters, trimmed
  limit?: number;  // Results per category, 1-100, default: 10
}
```

**Output:**

```typescript
{
  quotes: Array<{
    id: number;
    type: "quote";
    title: string; // e.g., "Quote #12345"
    description?: string; // Quote notes
    url: string; // Navigation URL
    metadata: {
      orderNumber: string | null;
      total: number | null;
      clientId: number | null;
    };
  }>;
  customers: Array<{
    id: number;
    type: "customer";
    title: string; // Client name
    description?: string; // Email address
    url: string; // Navigation URL
    metadata: {
      email: string | null;
      phone: string | null;
    };
  }>;
  products: Array<{
    id: number;
    type: "product";
    title: string; // Product code
    description?: string; // SKU
    url: string; // Navigation URL
    metadata: {
      quantityAvailable: number | null;
      unitPrice: number | null;
    };
  }>;
}
```

**Example:**

```typescript
const { data } = trpc.search.global.useQuery({
  query: "OG Kush",
  limit: 5,
});

console.log(data);
// {
//   quotes: [
//     {
//       id: 1234,
//       type: "quote",
//       title: "Quote #Q-2025-1234",
//       description: "OG Kush bulk order",
//       url: "/quotes?selected=1234",
//       metadata: { orderNumber: "Q-2025-1234", total: 5000, clientId: 42 }
//     }
//   ],
//   customers: [
//     {
//       id: 42,
//       type: "customer",
//       title: "OG Kush Dispensary",
//       description: "contact@ogkush.com",
//       url: "/clients/42",
//       metadata: { email: "contact@ogkush.com", phone: "555-0123" }
//     }
//   ],
//   products: [
//     {
//       id: 567,
//       type: "product",
//       title: "OG-KUSH-AAA-001",
//       description: "SKU-567890",
//       url: "/inventory/567",
//       metadata: { quantityAvailable: 250, unitPrice: 15.50 }
//     }
//   ]
// }
```

---

## Search Behavior

### Searchable Fields

| Entity        | Searchable Fields             |
| ------------- | ----------------------------- |
| **Quotes**    | Order ID, Order Number, Notes |
| **Customers** | Name, Email, Phone, TERI Code |
| **Products**  | Product Code, SKU             |

### Search Matching

- Uses SQL `LIKE` with wildcards (`%query%`)
- Case-insensitive matching
- Partial match support (e.g., "OG" matches "OG Kush")
- Searches all fields simultaneously with OR logic

### Performance Considerations

- Each category is limited independently
- Results are fetched in parallel
- Consider using more specific searches for large datasets
- Index-optimized for common search patterns

---

## Input Validation

### Query Validation

```typescript
// Valid
{ query: "OG Kush", limit: 10 }
{ query: "a", limit: 5 }  // Minimum 1 character

// Invalid
{ query: "", limit: 10 }  // Error: "Search query is required"
{ query: "x".repeat(201), limit: 10 }  // Error: "Search query too long"
```

### Limit Validation

```typescript
// Valid
{ query: "test", limit: 1 }
{ query: "test", limit: 100 }
{ query: "test" }  // Uses default: 10

// Invalid
{ query: "test", limit: 0 }  // Error: "Limit must be at least 1"
{ query: "test", limit: 101 }  // Error: "Limit cannot exceed 100"
{ query: "test", limit: 5.5 }  // Error: "Limit must be a whole number"
```

---

## Usage Examples

### React Component Integration

```typescript
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

function GlobalSearch() {
  const [query, setQuery] = useState('');

  const { data, isLoading } = trpc.search.global.useQuery(
    { query, limit: 10 },
    { enabled: query.length >= 1 }
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search quotes, customers, products..."
      />

      {isLoading && <div>Searching...</div>}

      {data && (
        <div>
          <section>
            <h3>Quotes ({data.quotes.length})</h3>
            {data.quotes.map(q => (
              <a key={q.id} href={q.url}>{q.title}</a>
            ))}
          </section>

          <section>
            <h3>Customers ({data.customers.length})</h3>
            {data.customers.map(c => (
              <a key={c.id} href={c.url}>{c.title}</a>
            ))}
          </section>

          <section>
            <h3>Products ({data.products.length})</h3>
            {data.products.map(p => (
              <a key={p.id} href={p.url}>{p.title}</a>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
```

### Debounced Search

```typescript
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

function DebouncedSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data } = trpc.search.global.useQuery(
    { query: debouncedQuery, limit: 10 },
    { enabled: debouncedQuery.length >= 2 }
  );

  // ...
}
```

---

## Error Handling

```typescript
try {
  const results = await trpc.search.global.query({ query: "test" });
} catch (error) {
  if (error.code === "UNAUTHORIZED") {
    // User not logged in
  } else if (error.code === "FORBIDDEN") {
    // User lacks clients:read permission
  } else if (error.code === "BAD_REQUEST") {
    // Invalid input (query too long, invalid limit)
  } else if (error.code === "INTERNAL_SERVER_ERROR") {
    // Database error
  }
}
```

---

## Related Routers

- [Clients](./clients.md) - Full client management
- [Orders](./orders.md) - Order and quote management
- [Inventory](./inventory.md) - Product/batch management

---

_Documentation generated as part of the Documentation & Testing Infrastructure Sprint_
