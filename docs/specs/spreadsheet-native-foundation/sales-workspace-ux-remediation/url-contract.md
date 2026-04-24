# Sales URL Canonicalization Contract

This table defines how malformed or conflicting sales workspace URLs should resolve during the current remediation wave.

| Input pattern                                                         | Canonical output                                                                     | Strategy        | Notes                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------- | ------------------------------------ |
| `/sales?tab=sales-sheets&surface=sheet-native&ordersView=document`    | `/sales?tab=orders&surface=sheet-native&ordersView=document`                         | Client redirect | Core defect from the live audit.     |
| `/sales?tab=sales-sheets&ordersView=document&draftId=<id>`            | `/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=<id>`            | Client redirect | Preserve the draft seed context.     |
| `/sales?tab=sales-sheets&ordersView=document&quoteId=<id>&mode=quote` | `/sales?tab=orders&surface=sheet-native&ordersView=document&quoteId=<id>&mode=quote` | Client redirect | Preserve quote import context.       |
| `/sales?tab=sales-sheets&ordersView=document&needId=<id>`             | `/sales?tab=orders&surface=sheet-native&ordersView=document&needId=<id>`             | Client redirect | Preserve demand-supply seed context. |
| `/sales?tab=sales-sheets&ordersView=document&fromSalesSheet=true`     | `/sales?tab=orders&surface=sheet-native&ordersView=document&fromSalesSheet=true`     | Client redirect | Preserve catalogue-import context.   |
| `/sales?tab=sales-sheets`                                             | unchanged                                                                            | No redirect     | Valid catalogue route.               |

## Redirect Contract

- The redirect is client-side and deterministic.
- The canonical destination is bookmarkable and should be used in future route builders.
- Route params unrelated to the orders document flow are not intentionally carried forward in this wave.
