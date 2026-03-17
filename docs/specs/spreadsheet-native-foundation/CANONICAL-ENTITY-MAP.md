# Canonical Entity Map

This map resolves the unstable entity seams that would otherwise make the spreadsheet-native fork bind to the wrong abstractions.

## Entity Families

| Entity Family              | Canonical Tables                                                              | Alias / Support Tables                                                           | Deprecated Tables        | Owner Surface                          | Fork Rule                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Party Model                | `clients`, `supplierProfiles`                                                 | `clientNotes`, `clientTransactions`, `clientActivity`, `clientLedgerAdjustments` | `vendors`, `vendorNotes` | `Relationships`                        | fork treats `clients` plus `supplierProfiles` as canonical; vendor data is legacy compatibility only    |
| Inventory Stock            | `batches`, `inventoryMovements`, `lots`                                       | `inventoryViews`, `batchLocations`, `batchStatusHistory`, `inventoryAlerts`      | -                        | `Operations -> Inventory`              | first pilot owns stock browsing and stock mutation, not transfer/setup administration                   |
| Product Catalog            | `products`, `brands`, `strains`, `categories`, `subcategories`, `grades`      | `productMedia`, `productTags`, `productSynonyms`, `productImages`                | -                        | `Relationships` + `Operations` support | pilots consume read models; master-data admin stays outside first pilots                                |
| Sales Documents            | `orders`, `orderLineItems`, `orderLineItemAllocations`, `orderStatusHistory`  | `returns`, `vendorReturns`, `orderAuditLog`, `recurringOrders`                   | -                        | `Sales -> Orders`                      | orders pilot owns order workflow and draft flow; adjacent actions remain linked where ownership differs |
| Financial Outputs          | `invoices`, `invoiceLineItems`, `payments`, `ledgerEntries`, `accounts`       | `transactions`, `transactionLinks`, `receipts`, `credits`                        | -                        | `Accounting`                           | Accounting owns document output truth and payment execution                                             |
| Location and Transfers     | `locations`, `storageZones`, `sites`, `siteTransfers`, `siteInventoryCounts`  | `batchZoneAssignments`, `calendarFinancials` where relevant                      | -                        | `Locations / Storage`                  | pilots may launch or summarize these surfaces, but first inventory sheet does not absorb them           |
| Calendar and Scheduling    | `calendarEvents`, `appointmentRequests`, `timeOffRequests`, scheduling tables | meeting history and invitation tables                                            | -                        | `Calendar`                             | exception-owned surface                                                                                 |
| Live Shopping              | `liveShoppingSessions`, `sessionCartItems`, `sessionPriceOverrides`           | live catalog extensions                                                          | -                        | `Live Shopping`                        | exception-owned surface                                                                                 |
| VIP Portal                 | VIP portal tables                                                             | leaderboard and portal auth extensions                                           | -                        | `VIP Portal`                           | exception-owned surface                                                                                 |
| Photography / Media Review | `productImages`, `demoMediaBlobs`                                             | batch media support                                                              | -                        | `Photography`                          | exception-owned surface; pilots can only use bounded thumbnail/media support                            |

## High-Risk Resolution

The most important immediate decision is the party model:

- future fork logic must be written against `clients` and `supplierProfiles`
- legacy `vendors` support remains real current behavior, but it is not the future canonical abstraction
- any pilot needing supplier selection may consume a normalized supplier adapter, not the raw `vendors` table directly
