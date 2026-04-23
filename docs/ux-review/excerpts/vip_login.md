# Baseline excerpt for `VIPLogin`

**Route:** `/vip-portal/login` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `VIPLogin`

* **Route:** `/vip-portal/login`.
* **Purpose:** Login for external VIP clients.
* **tRPC:** `vipPortal.auth.login` (stores `vip_session_token`/`vip_client_id`/`vip_client_name` in localStorage; redirects to `/vip-portal/dashboard`).
* **UX:** Inline error + toast. Forgot password → toast directing to contact support.

---

## Runtime supplement (if any)

(no runtime supplement match)
