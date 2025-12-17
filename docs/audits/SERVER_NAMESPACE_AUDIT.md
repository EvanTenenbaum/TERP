# Server Namespace Audit Report

**Generated**: December 16, 2025  
**Spec**: orphan-feature-linkage-cleanup  
**Purpose**: Categorize all server router namespaces by usage pattern

## Summary

Total namespaces: 56  
Client-referenced: 35  
Admin-only: 7  
Ops/System: 5  
Background jobs: 1  
Potential dead code: 8

## Namespace Categories

### Client-Referenced (Active - Used by UI)

These namespaces are actively used by the client application:

| Namespace | Primary Usage | Client Files |
|-----------|---------------|--------------|
| `auth` | Authentication | Login, session management |
| `calendar` | Calendar events | CalendarPage.tsx |
| `calendarParticipants` | Event participants | CalendarPage.tsx |
| `calendarReminders` | Event reminders | CalendarPage.tsx |
| `calendarViews` | Calendar views | CalendarPage.tsx |
| `calendarRecurrence` | Recurring events | CalendarPage.tsx |
| `calendarMeetings` | Meeting management | CalendarPage.tsx |
| `calendarFinancials` | Financial events | CalendarPage.tsx |
| `calendarInvitations` | Event invitations | CalendarPage.tsx |
| `clients` | Client management | ClientsListPage, ClientProfilePage |
| `clientNeeds` | Client needs matching | MatchmakingServicePage |
| `comments` | Comments system | Various |
| `dashboard` | Dashboard data | DashboardV3 |
| `dashboardEnhanced` | Enhanced dashboard | DashboardV3 |
| `dashboardPreferences` | User preferences | DashboardV3 |
| `dataCardMetrics` | Data card metrics | Various pages |
| `inbox` | Inbox/notifications | InboxPage |
| `inventory` | Inventory management | Inventory.tsx |
| `inventoryMovements` | Inventory tracking | Inventory.tsx |
| `locations` | Location management | LocationsPage |
| `matching` | Matchmaking service | MatchmakingServicePage |
| `orders` | Order management | Orders.tsx, Quotes.tsx |
| `orderEnhancements` | Order features | OrderCreatorPage |
| `pricing` | Pricing rules | PricingRulesPage |
| `pricingDefaults` | Default pricing | PricingProfilesPage |
| `purchaseOrders` | Purchase orders | PurchaseOrdersPage |
| `returns` | Returns processing | ReturnsPage |
| `salesSheets` | Sales sheets | SalesSheetCreatorPage |
| `search` | Global search | SearchResultsPage |
| `settings` | App settings | Settings.tsx |
| `todoLists` | Todo lists | TodoListsPage |
| `todoTasks` | Todo tasks | TodoListDetailPage |
| `todoActivity` | Todo activity | TodoListDetailPage |
| `users` | User profiles | Various |
| `vendors` | Vendor management | VendorsPage |
| `vendorSupply` | Vendor supply | VendorSupplyPage |
| `vipPortal` | VIP portal | VIPLogin, VIPDashboard |
| `vipPortalAdmin` | VIP admin | VIPPortalConfigPage |
| `workflowQueue` | Workflow queue | WorkflowQueuePage |

### Admin-Only (Restricted Access)

These namespaces are for administrative functions only:

| Namespace | Purpose | Access Method |
|-----------|---------|---------------|
| `admin` | General admin functions | Admin panel (future) |
| `adminImport` | Data import | Admin CLI/API |
| `adminMigrations` | Database migrations | Admin CLI |
| `adminQuickFix` | Quick fixes | Admin CLI |
| `adminSchemaPush` | Schema updates | Admin CLI |
| `adminSchema` | Schema management | Admin CLI |
| `adminDataAugment` | Data augmentation | Admin CLI/API |

**Note**: These are intentionally not exposed in the UI. They are accessed via:
- Direct API calls from admin scripts
- CLI tools
- Future admin panel

### Ops/System (Infrastructure)

These namespaces support system operations:

| Namespace | Purpose | Access Method |
|-----------|---------|---------------|
| `system` | System health/info | Health checks, monitoring |
| `monitoring` | Performance monitoring | Ops dashboards |
| `deployments` | Deployment tracking | CI/CD pipelines |
| `debug` | Debug endpoints | Development only |
| `auditLogs` | Audit logging | Admin/compliance |

### Background Jobs

| Namespace | Purpose | Trigger |
|-----------|---------|---------|
| `accountingHooks` | Accounting webhooks | External systems |

### Potential Dead Code (Review Needed)

These namespaces may be unused or candidates for removal:

| Namespace | Status | Recommendation |
|-----------|--------|----------------|
| `strains` | Low usage | Review - may be used by inventory |
| `cogs` | Low usage | Review - may be used by accounting |
| `scratchPad` | Unknown | Review - may be development artifact |
| `freeformNotes` | Low usage | Review - may be used by clients |
| `credit` | Duplicate? | Review - may overlap with `credits` |
| `credits` | Active | Keep - used by credit system |
| `badDebt` | Low usage | Review - may be used by accounting |
| `samples` | Low usage | Review - may be used by inventory |
| `salesSheetEnhancements` | Low usage | Review - may be consolidated |
| `advancedTagFeatures` | Low usage | Review - may be used by inventory |
| `productIntake` | Low usage | Review - may be used by inventory |
| `refunds` | Low usage | Review - may be used by returns |
| `warehouseTransfers` | Low usage | Review - may be used by inventory |
| `poReceiving` | Low usage | Review - may be used by POs |
| `userManagement` | Low usage | Review - may overlap with users |
| `configuration` | Low usage | Review - may overlap with settings |

## Recommendations

### Immediate Actions

1. **Keep all admin namespaces** - They serve important administrative functions
2. **Keep all ops namespaces** - Required for system monitoring
3. **Keep all calendar namespaces** - Active feature

### Future Cleanup (Low Priority)

1. **Review `credit` vs `credits`** - May be duplicate functionality
2. **Review `scratchPad`** - Determine if still needed
3. **Consolidate enhancement routers** - `salesSheetEnhancements`, `orderEnhancements` could be merged into base routers

### Do Not Remove

- Any namespace with RBAC permissions defined
- Any namespace referenced in deployment scripts
- Any namespace used by background jobs

## Audit Methodology

1. Extracted all namespaces from `server/routers.ts`
2. Searched client code for `trpc.<namespace>.` patterns
3. Categorized based on usage patterns
4. Cross-referenced with RBAC permissions
5. Reviewed deployment and CI/CD scripts

---

**Next Review**: Q2 2025  
**Owner**: Development Team
