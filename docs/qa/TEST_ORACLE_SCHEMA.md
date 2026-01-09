# TERP Test Oracle DSL Schema

**Version:** 1.0
**Format:** YAML

## Overview

The Test Oracle DSL provides a declarative, machine-readable format for defining E2E test scenarios. Each oracle describes:

1. **Identity & Context** - What flow this tests and who should run it
2. **Preconditions** - Required data state before execution
3. **Steps** - Sequential UI interactions
4. **Expected UI State** - What the browser should display after steps
5. **Expected DB State** - Database assertions for data integrity

## Schema Definition

### Root Structure

```yaml
# Required: Unique identifier following convention
flow_id: "Domain.Entity.FlowName[.Variant]"

# Required: Human-readable description
description: "Create a new draft order with line items"

# Required: QA role to authenticate as
role: "SalesRep"  # One of: SuperAdmin, SalesManager, SalesRep, InventoryManager, Fulfillment, AccountingManager, Auditor

# Optional: Named seed profile to use (defaults to 'standard')
seed_profile: "basic_sales"

# Optional: Tags for filtering
tags:
  - tier1
  - orders
  - smoke

# Optional: Timeout in milliseconds (default: 30000)
timeout: 45000

# Optional: Retry configuration
retry:
  count: 2
  delay: 1000

# Required: Preconditions section
preconditions: { ... }

# Required: Steps section
steps: [ ... ]

# Required: At least one of expected_ui or expected_db
expected_ui: { ... }
expected_db: { ... }
```

---

## Preconditions

Define data dependencies before test execution.

```yaml
preconditions:
  # Ensure specific seed entities exist
  ensure:
    - entity: "client"
      ref: "seed:client.redwood"
      # Optional: Additional conditions
      where:
        status: "active"

    - entity: "batch"
      ref: "seed:batch.og_kush"
      where:
        status: "LIVE"
        available_quantity_gte: 10

    - entity: "user"
      ref: "seed:user.sales_rep"

  # Optional: Create temporary test data
  create:
    - entity: "client"
      ref: "temp:test_client"
      data:
        name: "Test Client {{timestamp}}"
        teri_code: "TEST{{random:4}}"
        is_buyer: true

  # Optional: Feature flags that must be enabled
  feature_flags:
    - FEATURE_LIVE_CATALOG
    - ENABLE_DRAFT_ORDERS
```

### Reference Syntax

- `seed:<entity>.<name>` - References seeded data
- `temp:<name>` - References data created in preconditions
- `$created.<field>` - References data created during test steps
- `{{timestamp}}` - Current Unix timestamp
- `{{random:N}}` - N random alphanumeric characters
- `{{date:YYYY-MM-DD}}` - Formatted date

---

## Steps

Define sequential UI interactions.

### Action Types

#### Navigate
```yaml
- action: navigate
  path: "/orders/new"
  # Optional: Wait for specific element before proceeding
  wait_for: "[data-testid='order-form']"
```

#### Click
```yaml
- action: click
  # Target can be: selector, testid, text, or label
  target: "[data-testid='create-order-btn']"
  # OR
  target_text: "Create Order"
  # OR
  target_label: "Submit"

  # Optional: Wait after click
  wait_after: 500

  # Optional: Wait for navigation
  wait_for_navigation: true
```

#### Type/Fill
```yaml
- action: type
  target: "input[name='client_name']"
  value: "Redwood Dispensary"
  # OR reference seed data
  value_ref: "seed:client.redwood.name"

  # Optional: Clear before typing
  clear_first: true
```

#### Select (Dropdown/Combobox)
```yaml
- action: select
  target: "[data-testid='client-select']"
  value: "Redwood Dispensary"
  # OR by option value
  option_value: "client_123"
  # OR by index
  option_index: 0

  # For autocomplete/searchable dropdowns
  type_to_search: true
```

#### Add Line Item (Domain-Specific)
```yaml
- action: add_line_item
  # For order line items
  batch_ref: "seed:batch.og_kush"
  quantity: 5
  # Optional: Override price
  unit_price: 1000.00
  # Optional: Discount
  discount_percent: 10
```

#### Assert (Inline Assertions)
```yaml
- action: assert
  # Assert element visibility
  visible: "[data-testid='success-message']"
  # OR
  not_visible: ".error-message"
  # OR
  text_contains: "Order created"
  # OR
  value_equals:
    target: "input[name='total']"
    value: "5350.00"
```

#### Wait
```yaml
- action: wait
  # Wait for element
  for: "[data-testid='loading-complete']"
  timeout: 10000
  # OR wait fixed duration
  duration: 2000
  # OR wait for network idle
  network_idle: true
```

#### Screenshot
```yaml
- action: screenshot
  name: "order_created"
  # Optional: Full page
  full_page: true
```

#### Store Value
```yaml
- action: store
  # Store element text/value for later use
  from: "[data-testid='order-number']"
  as: "created_order_number"
  # Access later as: $stored.created_order_number
```

#### Custom Action (Escape Hatch)
```yaml
- action: custom
  # Raw Playwright code (use sparingly)
  code: |
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
```

---

## Expected UI State

Define assertions about the UI after steps complete.

```yaml
expected_ui:
  # URL assertions
  url_contains: "/orders/"
  url_matches: "/orders/\\d+"
  url_equals: "/orders/confirmation"

  # Element visibility
  visible:
    - "[data-testid='order-confirmation']"
    - ".success-toast"

  not_visible:
    - ".error-message"
    - "[data-testid='loading-spinner']"

  # Text content
  text_present:
    - "Order Created Successfully"
    - "Order #"

  # Field values
  fields:
    "[data-testid='order-status']": "Draft"
    "[data-testid='client-name']": "Redwood Dispensary"
    "input[name='quantity']": "5"

  # Computed/derived values
  totals:
    "[data-testid='subtotal']": 5000.00
    "[data-testid='tax']": 350.00
    "[data-testid='total']": 5350.00

  # Table assertions
  table:
    selector: "[data-testid='line-items-table']"
    min_rows: 1
    columns:
      - header: "Product"
        contains: "OG Kush"
      - header: "Quantity"
        equals: "5"
      - header: "Price"
        equals: "$1,000.00"
```

---

## Expected DB State

Define database assertions for data integrity verification.

```yaml
expected_db:
  # Assert row exists with specific values
  orders:
    - where:
        # Use stored/created values
        order_number: "$stored.created_order_number"
      expect:
        status: "draft"
        client_id: "$seed:client.redwood.id"
        type: "SALE"
      # Optional: Store for later assertions
      store_as: "created_order"

  order_line_items:
    - where:
        order_id: "$created_order.id"
      expect:
        batch_id: "$seed:batch.og_kush.id"
        quantity: 5
        unit_price: 1000.00
        line_total: 5000.00
      count: 1  # Exactly 1 matching row

  # Assert inventory movement was created
  inventory_movements:
    - where:
        reference_type: "ORDER"
        reference_id: "$created_order.id"
      expect:
        movement_type: "RESERVE"
        quantity: -5
        batch_id: "$seed:batch.og_kush.id"

  # Invariant check (computed assertion)
  invariants:
    - name: "Inventory balance"
      query: |
        SELECT
          b.current_quantity,
          (SELECT SUM(quantity) FROM inventory_movements WHERE batch_id = b.id) as movement_sum
        FROM batches b
        WHERE b.id = $seed:batch.og_kush.id
      assert: "current_quantity = movement_sum"

    - name: "Order total matches line items"
      query: |
        SELECT
          o.total,
          (SELECT SUM(line_total) FROM order_line_items WHERE order_id = o.id) as line_sum
        FROM orders o
        WHERE o.id = $created_order.id
      assert: "total = line_sum"
```

### DB Assertion Operators

In `where` clauses:
- `field: value` - Exact match
- `field_gte: value` - Greater than or equal
- `field_lte: value` - Less than or equal
- `field_like: pattern` - SQL LIKE pattern
- `field_in: [a, b, c]` - IN clause

In `expect` clauses:
- `field: value` - Exact match
- `field_not: value` - Not equal
- `field_gt: value` - Greater than
- `field_null: true` - IS NULL
- `field_not_null: true` - IS NOT NULL

---

## Complete Example

```yaml
flow_id: "Orders.DraftOrders.CreateWithLineItems"
description: "Create a new draft order with a single line item and verify totals"
role: "SalesRep"
seed_profile: "basic_sales"
tags:
  - tier1
  - orders
  - smoke
timeout: 45000

preconditions:
  ensure:
    - entity: "client"
      ref: "seed:client.redwood"
      where:
        status: "active"
    - entity: "batch"
      ref: "seed:batch.og_kush"
      where:
        status: "LIVE"
        available_quantity_gte: 10

steps:
  - action: navigate
    path: "/orders/new"
    wait_for: "[data-testid='order-form']"

  - action: select
    target: "[data-testid='client-select']"
    value_ref: "seed:client.redwood.name"
    type_to_search: true

  - action: click
    target: "[data-testid='add-line-item']"
    wait_after: 500

  - action: select
    target: "[data-testid='batch-select']"
    value_ref: "seed:batch.og_kush.display_name"
    type_to_search: true

  - action: type
    target: "input[name='quantity']"
    value: "5"
    clear_first: true

  - action: wait
    for: "[data-testid='line-total']"
    timeout: 5000

  - action: click
    target: "[data-testid='save-draft-btn']"
    wait_for_navigation: true

  - action: store
    from: "[data-testid='order-number']"
    as: "created_order_number"

  - action: screenshot
    name: "draft_order_created"

expected_ui:
  url_contains: "/orders/"
  visible:
    - "[data-testid='order-detail']"
    - "[data-testid='draft-badge']"
  fields:
    "[data-testid='order-status']": "Draft"
    "[data-testid='client-name']": "Redwood Dispensary"
  totals:
    "[data-testid='subtotal']": 5000.00
    "[data-testid='total']": 5350.00

expected_db:
  orders:
    - where:
        order_number: "$stored.created_order_number"
      expect:
        status: "draft"
        type: "SALE"
        client_id: "$seed:client.redwood.id"
      store_as: "created_order"

  order_line_items:
    - where:
        order_id: "$created_order.id"
      expect:
        batch_id: "$seed:batch.og_kush.id"
        quantity: 5
      count: 1
```

---

## Validation Rules

1. **flow_id** must be unique and follow naming convention
2. **role** must be a valid QA role
3. **steps** must have at least one action
4. **At least one** of `expected_ui` or `expected_db` must be defined
5. **References** must point to existing seed data or previously stored values
6. **Selectors** should prefer `data-testid` attributes

---

## File Organization

```
tests-e2e/
  oracles/
    orders/
      create-draft.oracle.yaml
      confirm-order.oracle.yaml
      fulfill-order.oracle.yaml
    inventory/
      create-batch.oracle.yaml
      update-status.oracle.yaml
    clients/
      create-client.oracle.yaml
    accounting/
      generate-invoice.oracle.yaml
    _seed-profiles/
      basic_sales.yaml
      inventory_intake.yaml
```

---

## Seed Profiles

Define reusable seed data configurations:

```yaml
# _seed-profiles/basic_sales.yaml
profile: "basic_sales"
description: "Standard sales scenario with active client and live inventory"

entities:
  client.redwood:
    table: "clients"
    data:
      name: "Redwood Dispensary"
      teri_code: "REDWOOD01"
      is_buyer: true
      status: "active"

  batch.og_kush:
    table: "batches"
    data:
      sku: "OGK-001"
      strain_name: "OG Kush"
      status: "LIVE"
      current_quantity: 100
      unit_price: 1000.00

  user.sales_rep:
    table: "users"
    data:
      email: "qa.salesrep@terp.test"
      role_id: "{{role:SalesRep}}"
```
