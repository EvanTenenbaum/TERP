# Baseline excerpt for `VIPDashboard`

**Route:** `/vip-portal/dashboard` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `VIPDashboard`

* **Route:** `/vip-portal`, `/vip-portal/dashboard`.
* **Purpose:** Client-facing hub; rendered modules depend on the per-client config:
  * **Dashboard** — current balance, YTD spend, greeting, quick links.
  * **Live Catalog** (`LiveCatalog`) — see offered inventory filtered to the client.
  * **Live Shopping** (`LiveShoppingPage` sub-route) — join active sessions.
  * **Marketplace Needs** (`MarketplaceNeeds`) — submit/view needs.
  * **Marketplace Supply** (`MarketplaceSupply`) — offered supply.
  * **Accounts Receivable** (`AccountsReceivable`) — invoices owed to TERP.
  * **Accounts Payable** (`AccountsPayable`) — bills TERP owes this client.
  * **Transaction History** (`TransactionHistory`).
  * **Leaderboard** (`Leaderboard`) — optional gamification.
  * **Appointments** (`AppointmentBooking`).
  * **Documents** (`DocumentDownloads`) — invoice/bill PDFs.
  * `VipNotificationsBell` in header.
  * `ImpersonationBanner` displayed when the admin is impersonating.
  * `VipTierBadge`.
* **Navigation:** Left tabs + hamburger drawer on mobile (`Sheet`). Logout button clears local/session storage.

---

## Runtime supplement (if any)

(no runtime supplement match)
