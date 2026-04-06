# TERP Staging UX/QA Running Bug Log

- Audit date: 2026-03-26
- Environment: `https://terp-staging-yicld.ondigitalocean.app`
- Role: `QA Super Admin`
- Method: live staging walkthrough with Playwright MCP, moderate-familiarity employee lens
- Status: complete

## Findings

| ID | Severity | Surface | Finding |
| --- | --- | --- | --- |
| BUG-001 | High | Dashboard | Dashboard load throws repeated `todoLists.getMyLists` 500 errors. |
| BUG-002 | Medium | Dashboard | KPI math is not believable: `Today $37,319` while `This Week $0`. |
| BUG-003 | Medium | Sales Orders | Sheet-native surface exposes rollout/pilot jargon instead of user-facing language. |
| BUG-004 | Low | Global Shell | Build/version metadata is visible in the normal operator shell. |
| BUG-005 | Medium | Sales Orders | Orders queue is polluted with obvious QA and test data. |
| BUG-006 | High | Sales Quotes | Quote table mixes `ORD-...` records into the quotes surface. |
| BUG-007 | Critical | Sales Quotes | `New Quote` routes to the sales-order builder instead of a quote flow. |
| BUG-008 | High | Sales Quotes | The flow launched from `New Quote` is labeled like a sales order, not a quote. |
| BUG-009 | Medium | Sales Quotes | Quote conversion modal is missing dialog description / `aria-describedby`. |
| BUG-010 | Medium | Sales Quotes | Large quote conversion fails with a backend 500 and weak recovery guidance. |
| BUG-011 | High | Sales Quotes | Successful conversion does not navigate to or highlight the created sales order. |
| BUG-012 | High | Sales Orders | `Generate Invoice` is enabled on an order state that cannot actually invoice. |
| BUG-013 | High | Sales Orders | Invoice failure leaks raw enum/state names into the UI. |
| BUG-014 | Medium | Sales Orders | Status labels and invoice prerequisite wording do not match each other. |
| BUG-015 | High | Sales Orders | Sheet-native and classic surfaces disagree on order identity/state. |
| BUG-016 | High | Sales Order Builder | Client picker is polluted with junk and test names. |
| BUG-017 | Medium | Sales Order Builder | Items marked awaiting intake or not sellable can still be added to an order. |
| BUG-018 | High | Sales Order Builder | Default pricing can create `0.00%` gross margin with no warning. |
| BUG-019 | Medium | Sales Orders | Payment status is shown as a bare `-` instead of meaningful copy. |
| BUG-020 | Medium | Sales Orders | Financial summary shows bizarre negative and owed credit values. |
| BUG-021 | Medium | Purchase Orders | Workspace metadata band uses internal rollout framing instead of operator context. |
| BUG-022 | Medium | Purchase Orders | `Expected` column is mostly `-` with no explanation. |
| BUG-023 | High | Purchase Orders | Row selection suggests richer context but only reveals a terse summary strip. |
| BUG-024 | High | Purchase Orders | Confirmed PO still exposes `Place Order` as an available action. |
| BUG-025 | Medium | Purchase Orders | `Start Receiving` silently context-switches into a receiving draft with no warning. |
| BUG-026 | Medium | Inventory Receiving | Strain naming is unpolished and inconsistent, for example `blue dream`. |
| BUG-027 | Medium | Inventory Receiving | Cost column shows bare numbers like `600` while summaries use currency formatting. |
| BUG-028 | High | Inventory Receiving | Attachments drawer opens at `0 selected` even when launched from a selected line. |
| BUG-029 | Medium | Inventory Receiving | Review modal has duplicate `Close` buttons. |
| BUG-030 | High | Inventory Receiving | Blocking review modal does not identify the exact line or field causing the block. |
| BUG-031 | High | Inventory Receiving | `Apply Grade` success toast does not update the visible grade cell. |
| BUG-032 | High | Inventory Receiving | Image-evidence blocker gives weak remediation guidance. |
| BUG-033 | Medium | Inventory Receiving | Bulk actions appear enabled before a line is selected. |
| BUG-034 | High | Inventory Intake | Intake opens with five blank pending rows already present. |
| BUG-035 | Medium | Inventory Intake | Surface says `All changes saved` even with blank, error-prone rows on screen. |
| BUG-036 | High | Inventory Intake | Location combobox repeats `Main Warehouse` multiple times. |
| BUG-037 | Medium | Inventory Intake | Default selected-row state is confusing, for example `Submit Selected (1)` on load. |
| BUG-038 | High | Inventory Intake | New rows show nonsense placeholders with blank supplier and product values. |
| BUG-039 | Medium | Inventory Intake | Edit drawer says `Select a row to edit` while a row is already open. |
| BUG-040 | Medium | Inventory Intake | Surface duplicates the `Close panel` affordance. |
| BUG-041 | Medium | Inventory Intake | Counters become counterintuitive after invalid submit, for example `Pending 4` and `Errors 1` from five rows. |
| BUG-042 | High | Inventory Intake | Shortcut hint says `Esc Close` but Escape did not close the panel. |
| BUG-043 | Medium | Inventory Intake | Validation error is weakly anchored and easy to miss. |
| BUG-044 | Medium | Inventory Intake | Deferred photo upload copy hides risky validation behavior. |
| BUG-045 | High | Shipping | Shipping queue is polluted with obvious QA and test clients/orders. |
| BUG-046 | Medium | Shipping | Shipping summary metrics have no date or time-window context. |
| BUG-047 | Medium | Shipping | Queue mixes `S-...` and `O-...` IDs with no explanation. |
| BUG-048 | High | Shipping | Order details drawer duplicates `Close panel`. |
| BUG-049 | Medium | Shipping | Order total is shown without currency formatting in the detail panel. |
| BUG-050 | Critical | Shipping | Opening the order details drawer intercepts pointer events and blocks `Pack All to One Bag`. |
| BUG-051 | Medium | Shipping | Order items degrade to generic labels like `Item 1` and `N/A`. |
| BUG-052 | Medium | Accounting Invoices | Workspace header uses internal framing like `Start here` and `Flow` instead of task language. |
| BUG-053 | High | Accounting Invoices | Invoice list contains duplicate invoice pairs with different ID formats for the same customer and amount. |
| BUG-054 | Critical | Accounting Invoices | Paid invoices show negative due values, for example `INV-000023` at `-$136.90`. |
| BUG-055 | Critical | Accounting Invoices | Some rows are marked `PAID` while still showing the full invoice amount due. |
| BUG-056 | Medium | Accounting Invoices | Invoice detail drawer duplicates `Close panel`. |
| BUG-057 | Critical | Accounting Invoices | Invoice detail can show `Amount Paid` greater than `Total` and a negative amount due. |
| BUG-058 | High | Accounting Invoices | Invoice detail says the GL entry is active and posted, but `View GL Entries` says no ledger entries exist. |
| BUG-059 | Medium | Accounting Invoices | `Create Invoice` modal is missing dialog description / `aria-describedby`. |
| BUG-060 | High | Accounting Invoices | `Create Invoice` client picker is polluted with junk and test entities. |
| BUG-061 | Medium | Accounting Payments | Payments table mixes `PAY-`, `PMT-SNT-`, and `PMT-RCV-` ID styles without explanation. |
| BUG-062 | Medium | Accounting Payments | Many payment rows use a bare `-` reference value, especially for cash transactions. |
| BUG-063 | High | Client Credit | `Issue Credit Adjustment` requires a raw numeric `Client ID` instead of a searchable client selector. |
| BUG-064 | High | Client Credit | `Issue Adjustment` appears enabled even when required fields are empty. |
| BUG-065 | Medium | Client Credit | Empty submit gives only a generic toast with no field-level guidance. |
| BUG-066 | High | Relationships | Clients list is heavily polluted with obvious QA and test records. |
| BUG-067 | Medium | Relationships | `Clients` tab mixes customers and suppliers in one list without clarifying the rule. |
| BUG-068 | Medium | Client Detail | Header copy sounds like internal product strategy instead of operator-facing guidance. |
| BUG-069 | Medium | Client Detail | Same account can show both `Customer` and `Supplier` badges with no explanation. |
| BUG-070 | High | Client Detail | Credit exposure signal warns the user while the stored credit limit is `$0.00`, creating contradictory trust cues. |
| BUG-071 | High | Client Detail | Dual-role account shows supplier badges but large parts of supplier information are missing. |
| BUG-072 | High | Client Detail | Lifetime value, profit, and margin figures are implausible together, for example large LTV with `$0.00` profit and `0.0%` margin. |
| BUG-073 | Medium | Client Detail | `VIP Portal` and `Live Catalog` copy uses internal feature/control jargon. |
| BUG-074 | Medium | Client Detail | Supplier profile section is mostly blank dashes with no empty-state guidance. |
| BUG-075 | Medium | Client Detail | `Recent Purchase Orders` shows an empty block with no explanation or next step. |
| BUG-076 | High | Client Money Tab | `Receivable` and `Ledger Net` totals are massively different with no explanation. |
| BUG-077 | High | Client Money Tab | Transaction history contains duplicate rows for the same orders. |
| BUG-078 | Medium | Client Money Tab | History mixes `TXN-...` and `ORD-...` records for the same underlying activity without explanation. |
| BUG-079 | High | Settings Users | Users page throws repeated JavaScript `TypeError` errors on load. |
| BUG-080 | Critical | Settings Users | `Create New User` and `Reset Password` forms are prefilled with default admin credentials. |
| BUG-081 | Medium | Settings Users | Users list is cluttered with obvious QA and test accounts. |
| BUG-082 | Medium | Settings Users | Inline `Delete user` actions are exposed broadly with little friction. |
| BUG-083 | Medium | Settings Feature Flags | Feature flags page uses internal copy like `Access rollout controls and internal support tooling.` |
| BUG-084 | High | Settings Feature Flags | Feature flags table exposes raw internal identifiers to a normal admin workflow. |
| BUG-085 | Medium | Settings Feature Flags | Flag naming is inconsistent and noisy, mixing styles like `work-surface-*`, `module-*`, and `WORK_SURFACE_*`. |
| BUG-086 | Medium | Analytics | Navigation and breadcrumb call the surface `Reports` while the page header calls it `Analytics`. |
| BUG-087 | High | Analytics | Analytics page still triggers unrelated `todoLists.getMyLists` 500 errors on load. |
| BUG-088 | High | Analytics Clients | `Top Clients` ranks an obvious test client in the revenue leaderboard. |
| BUG-089 | Medium | Analytics Inventory | `Inventory Value` card renders without an actual value and punts the user to export data instead. |
| BUG-090 | High | Calendar | Month view is populated with lorem-ipsum business-gibberish event titles instead of trustworthy operational events. |
| BUG-091 | High | Calendar | Month view leaks `QA Chain Event ...` test records into the live calendar. |
| BUG-092 | Medium | Calendar | Event edit dialog is missing dialog description / `aria-describedby`. |
| BUG-093 | High | Calendar | Editing an existing event shows required `Calendar *` as `Select calendar`, losing the current assignment. |
| BUG-094 | High | Calendar | Updating an event as `QA Super Admin` fails with a generic toast while the console reports `Permission denied`. |
| BUG-095 | High | Calendar Filters | Filters expose `VENDORS` terminology even though the product standard is to use clients with `isSeller=true`. |
| BUG-096 | Medium | Calendar Filters | Filter labels are dumped as raw uppercase enums like `IN PROGRESS` and `PAYMENT DUE`. |
| BUG-097 | High | Calendar Events | Create/edit attendee picker is polluted with test and demo accounts. |
| BUG-098 | Medium | Calendar Events | Attendee list contains duplicate QA Oracle role options. |
| BUG-099 | High | Calendar Events | Empty `Create Event` submit produces no visible field-level validation. |
| BUG-100 | Medium | Calendar Events | `Create Event` can be launched while the user is on the `Requests` tab, leaving the requests list behind and muddling context. |
| BUG-101 | Medium | Calendar Time Off | Empty `Submit Request` only shifts focus to the first date field with no inline explanation. |
| BUG-102 | High | Mobile Shell | Mobile `Close menu` button is rendered outside the viewport and cannot be clicked. |
| BUG-103 | High | Mobile Shell | Major routes open on mobile with the full navigation drawer already covering the workspace. |
| BUG-104 | Medium | Mobile Sales | Sales mobile tab strip hides key tabs off-screen and relies on a tiny `Swipe for more tabs` hint for discovery. |
| BUG-105 | Medium | Mobile Sales | Sales mobile view burns vertical space on rollout and release-gate copy before showing actionable data. |
| BUG-106 | Medium | Mobile Inventory Intake | Intake mobile surface still shows the duplicated `Main WarehouseMain Warehouse...` location value, now even harder to parse in narrow width. |
| BUG-107 | Medium | Calendar Time Off | Time-off request opens as an inline panel instead of a focused dialog, making the action feel bolted onto the list. |
| BUG-108 | High | Calendar Events | Required `Calendar *` field starts empty in create mode while the `Create Event` button remains enabled. |
| BUG-109 | Medium | Calendar Requests | Requests empty state is passive and offers no operator next step beyond showing `0`. |
| BUG-110 | Medium | Settings Users | Password inputs raise browser autocomplete warnings, suggesting poor form hygiene on security-sensitive fields. |
| BUG-111 | Medium | Mobile Navigation | Mobile header shows both `Open navigation` and the expanded drawer at once, creating contradictory menu state. |
| BUG-112 | Medium | Analytics Inventory | Inventory analytics tab feels unfinished compared with the other tabs, with only one real metric card and a passive export prompt. |
| BUG-113 | Medium | Calendar View Switcher | Month/Week/Day/Agenda view buttons are icon-only in the main toolbar, forcing guesswork on first use. |

## Notes

- Screenshots are saved in `docs/qa-reports/2026-03-26-staging-ux-qa-audit/screenshots`.
- This was a read-only audit. No application code was changed.
