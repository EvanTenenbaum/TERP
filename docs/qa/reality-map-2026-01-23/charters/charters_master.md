# TERP Charter Library

**Generated**: 2026-01-23 15:52:44  
**Total Charters**: 509

## Summary Statistics

### By Implementation Status

| Status | Count |
|--------|-------|
| API_ONLY | 81 |
| CLIENT_WIRED | 421 |
| DEPRECATED | 6 |
| UNKNOWN | 1 |

### By Priority

| Priority | Count |
|----------|-------|
| P0 | 194 |
| P1 | 8 |
| P2 | 307 |

### By Domain

| Domain | Count |
|--------|-------|
| Accounting | 52 |
| Inventory | 37 |
| Orders | 37 |
| Calendar | 34 |
| CRM | 28 |
| Admin | 27 |
| Scheduling | 24 |
| VIP Portal | 22 |
| Live Shopping | 20 |
| Pricing | 16 |
| Purchase Orders | 16 |
| Storage | 16 |
| Analytics | 15 |
| Admin Tools | 15 |
| Tags | 14 |
| Workflow | 13 |
| Samples | 13 |
| Dashboard | 12 |
| Gamification | 12 |
| Returns | 12 |
| Strains | 8 |
| Vendor Supply | 7 |
| User Management | 7 |
| Deprecated | 6 |
| Configuration | 6 |
| Organization | 6 |
| Recurring Orders | 6 |
| COGS | 5 |
| Client Ledger | 5 |
| Bad Debt | 5 |
| Health | 5 |
| Auth | 4 |
| Debug | 4 |

## Golden Paths (12 selected)

These flows represent the most critical cross-module business processes:

1. **Update Status** (Orders / Pick Pack)
   - Charter ID: `CH_orders_pick_pack_update_status`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

2. **Update Order Status** (Orders / Order Status)
   - Charter ID: `CH_orders_order_status_update_order_status`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

3. **Update Order** (Orders / Orders)
   - Charter ID: `CH_orders_orders_update_order`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

4. **Update Status** (Inventory / Batches)
   - Charter ID: `CH_inventory_batches_update_status`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

5. **Update Product** (Inventory / Products)
   - Charter ID: `CH_inventory_products_update_product`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

6. **Void Invoice** (Accounting / Invoices)
   - Charter ID: `CH_accounting_invoices_void_invoice`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

7. **Update Status** (Accounting / Invoices)
   - Charter ID: `CH_accounting_invoices_update_status`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

8. **Mark Sent** (Accounting / Invoices)
   - Charter ID: `CH_accounting_invoices_mark_sent`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

9. **Update Task** (Workflow / Todo Lists)
   - Charter ID: `CH_workflow_todo_lists_update_task`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

10. **Update Status** (Purchase Orders / PO Core)
   - Charter ID: `CH_purchase_orders_po_core_update_status`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

11. **Update Role** (Admin / RBAC Roles)
   - Charter ID: `CH_admin_rbac_roles_update_role`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A

12. **Update PO** (Purchase Orders / PO Core)
   - Charter ID: `CH_purchase_orders_po_core_update_po`
   - Mutation: WRITE
   - Role: SUPER_ADMIN
   - UI Path: N/A


## P0 CLIENT_WIRED Charters

**Count**: 146

| Charter ID | Domain | Entity | Flow Name | Mutation | Role |
|------------|--------|--------|-----------|----------|------|
| CH_accounting_invoices_list_invoices | Accounting | Invoices | List Invoices | READ | SUPER_ADMIN |
| CH_accounting_invoices_get_invoice_by_id | Accounting | Invoices | Get Invoice By ID | READ | SUPER_ADMIN |
| CH_accounting_invoices_generate_from_order | Accounting | Invoices | Generate From Order | WRITE | SUPER_ADMIN |
| CH_accounting_invoices_update_status | Accounting | Invoices | Update Status | WRITE | SUPER_ADMIN |
| CH_accounting_invoices_mark_sent | Accounting | Invoices | Mark Sent | WRITE | SUPER_ADMIN |
| CH_accounting_invoices_void_invoice | Accounting | Invoices | Void Invoice | WRITE | SUPER_ADMIN |
| CH_accounting_invoices_get_summary | Accounting | Invoices | Get Summary | READ | SUPER_ADMIN |
| CH_inventory_batches_list_batches | Inventory | Batches | List Batches | READ | SUPER_ADMIN |
| CH_inventory_batches_get_batch_by_id | Inventory | Batches | Get Batch By ID | READ | SUPER_ADMIN |
| CH_inventory_batches_create_batch | Inventory | Batches | Create Batch | WRITE | SUPER_ADMIN |
| CH_inventory_batches_update_batch | Inventory | Batches | Update Batch | WRITE | SUPER_ADMIN |
| CH_inventory_batches_delete_batch | Inventory | Batches | Delete Batch | WRITE | SUPER_ADMIN |
| CH_inventory_batches_update_status | Inventory | Batches | Update Status | WRITE | SUPER_ADMIN |
| CH_inventory_batches_get_available_quantity | Inventory | Batches | Get Available Quantity | READ | SUPER_ADMIN |
| CH_inventory_movements_record_movement | Inventory | Movements | Record Movement | WRITE | SUPER_ADMIN |
| CH_inventory_movements_decrease_inventory | Inventory | Movements | Decrease Inventory | WRITE | SUPER_ADMIN |
| CH_inventory_movements_increase_inventory | Inventory | Movements | Increase Inventory | WRITE | SUPER_ADMIN |
| CH_inventory_movements_adjust_inventory | Inventory | Movements | Adjust Inventory | WRITE | SUPER_ADMIN |
| CH_inventory_movements_get_by_batch | Inventory | Movements | Get By Batch | READ | SUPER_ADMIN |
| CH_inventory_movements_get_by_reference | Inventory | Movements | Get By Reference | READ | SUPER_ADMIN |
| CH_inventory_movements_validate_availability | Inventory | Movements | Validate Availability | READ | SUPER_ADMIN |
| CH_inventory_movements_get_summary | Inventory | Movements | Get Summary | READ | SUPER_ADMIN |
| CH_inventory_movements_reverse_movement | Inventory | Movements | Reverse Movement | WRITE | SUPER_ADMIN |
| CH_inventory_cogs_get_cogs | Inventory | COGS | Get COGS | READ | SUPER_ADMIN |
| CH_inventory_cogs_calculate_impact | Inventory | COGS | Calculate Impact | READ | SUPER_ADMIN |
| CH_inventory_cogs_update_batch_cogs | Inventory | COGS | Update Batch COGS | WRITE | SUPER_ADMIN |
| CH_inventory_cogs_get_history | Inventory | COGS | Get History | READ | SUPER_ADMIN |
| CH_inventory_cogs_get_cogs_by_batch | Inventory | COGS | Get COGS By Batch | READ | SUPER_ADMIN |
| CH_inventory_products_list_products | Inventory | Products | List Products | READ | SUPER_ADMIN |
| CH_inventory_products_get_product_by_id | Inventory | Products | Get Product By ID | READ | SUPER_ADMIN |
| CH_inventory_products_create_product | Inventory | Products | Create Product | WRITE | SUPER_ADMIN |
| CH_inventory_products_update_product | Inventory | Products | Update Product | WRITE | SUPER_ADMIN |
| CH_inventory_products_delete_product | Inventory | Products | Delete Product | WRITE | SUPER_ADMIN |
| CH_inventory_products_restore_product | Inventory | Products | Restore Product | WRITE | SUPER_ADMIN |
| CH_inventory_products_get_categories | Inventory | Products | Get Categories | READ | SUPER_ADMIN |
| CH_inventory_products_get_brands | Inventory | Products | Get Brands | READ | SUPER_ADMIN |
| CH_inventory_strains_list_strains | Inventory | Strains | List Strains | READ | SUPER_ADMIN |
| CH_inventory_strains_get_strain_by_id | Inventory | Strains | Get Strain By ID | READ | SUPER_ADMIN |
| CH_inventory_strains_search_strains | Inventory | Strains | Search Strains | READ | SUPER_ADMIN |
| CH_inventory_strains_create_strain | Inventory | Strains | Create Strain | WRITE | SUPER_ADMIN |
| CH_inventory_strains_get_family | Inventory | Strains | Get Family | READ | SUPER_ADMIN |
| CH_inventory_strains_get_family_stats | Inventory | Strains | Get Family Stats | READ | SUPER_ADMIN |
| CH_inventory_strains_fuzzy_search | Inventory | Strains | Fuzzy Search | READ | SUPER_ADMIN |
| CH_inventory_strains_get_or_create | Inventory | Strains | Get Or Create | WRITE | SUPER_ADMIN |
| CH_orders_orders_create_order | Orders | Orders | Create Order | WRITE | SUPER_ADMIN |
| CH_orders_orders_get_order_by_id | Orders | Orders | Get Order By ID | READ | SUPER_ADMIN |
| CH_orders_orders_get_orders_by_client | Orders | Orders | Get Orders By Client | READ | SUPER_ADMIN |
| CH_orders_orders_get_all_orders | Orders | Orders | Get All Orders | READ | SUPER_ADMIN |
| CH_orders_orders_update_order | Orders | Orders | Update Order | WRITE | SUPER_ADMIN |
| CH_orders_orders_delete_order | Orders | Orders | Delete Order | WRITE | SUPER_ADMIN |

*... and 96 more*
