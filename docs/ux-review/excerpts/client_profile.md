# Baseline excerpt for `ClientProfilePage`

**Route:** `/clients/1` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `ClientProfilePage`

* **Route:** `/clients/:id`.
* **Access:** All authenticated users; some actions gated by permissions & `useCreditVisibility`.
* **Purpose:** Unified 360° profile for any client (customer, supplier, or dual-role).
* **Shell:** `LinearWorkspaceShell` with five sections:
  * **Overview** — metric cards, `RelationshipRoleBadge`, quick stats, freeform notes (`FreeformNoteWidget`), comments (`CommentWidget`).
  * **Sales & Pricing** — `PricingConfigTab` (profile & rule overrides), `ClientNeedsTab`, VIP portal settings (`VIPPortalSettings`, `LiveCatalogConfig`).
  * **Money** — credit status (`CreditStatusCard`), `ConsignmentRangePanel`, ledger timeline, invoices/orders/payments rows, `PaymentFollowUpPanel` (open SMS/email templates from `buildPaymentFollowUpSubject`/`Notes`).
  * **Supply & Inventory** — `SupplierProfileSection` (for suppliers), batch/lot history, active supply entries.
  * **Activity** — `CommunicationTimeline` and `AddCommunicationModal` for logging calls/SMS/email/meeting/note.
* **Per-section actions:** Edit client (dialog), change relationship roles, add/edit communication, open calendar for meetings (`ClientCalendarTab`), book appointment, view ledger, drill to order/payment/PO, configure VIP portal.
* **Business rules:**
  * Credit visibility gates whether credit fields show in overview/money sections.
  * Links in Money ledger route to the right surface: orders → sales workspace, payments → `/accounting/payments?id=`, POs → `/purchase-orders?poId=`.
* **tRPC:** `clients.getById`, `clientCommunications.*`, `clientLedger.*`, `credits.*`, `relationshipProfile.*`, `client360.*`, `comments.*`, `freeformNotes.*`, `vipPortalAdmin.config.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
