# Router-to-Table Ownership Map

Generated from [`generated/router-table-ownership.csv`](./generated/router-table-ownership.csv) on March 14, 2026.

## Summary

- total router-to-table edges: `317`
- top direct-import density is concentrated in complex cross-domain routers such as `vipPortal`, `relationshipProfile`, `orders`, `poReceiving`, `payments`, and `purchaseOrders`

The point of this map is not that every direct import is wrong. The point is that the fork must know where domain truth is already concentrated before it builds adapters.

## Pilot-Relevant Router Ownership

| Router        | Pilot Role                            | Core Tables / Domains                                                                                                    |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `orders`      | primary sales pilot router            | `orders`, `orderLineItems`, `orderLineItemAllocations`, `batches`, `clients`, `inventoryMovements`, `orderStatusHistory` |
| `inventory`   | primary operations pilot router       | `batches`, `inventoryMovements`, `inventoryViews`, supplier/support lookups, bounded intake/media support                |
| `payments`    | adjacent accounting handoff           | `payments`, `transactions`, linked accounting truth                                                                      |
| `invoices`    | adjacent document output truth        | `invoices`, invoice line items, output generation dependencies                                                           |
| `returns`     | adjacent sales/operations return flow | returns execution and restock/vendor-return ownership                                                                    |
| `locations`   | adjacent setup ownership              | location administration                                                                                                  |
| `storage`     | adjacent transfer/storage ownership   | site, zone, transfer truth                                                                                               |
| `photography` | exception support                     | media review ownership                                                                                                   |

## Fork Rule

Adapters should be built from owner routers and adjacent linked routers, not from the current page tree.

For the pilots:

- Orders sheet adapters should anchor on `orders`
- Inventory sheet adapters should anchor on `inventory`
- Accounting, Returns, Locations, and Storage should appear only as linked owner surfaces where explicitly assigned
