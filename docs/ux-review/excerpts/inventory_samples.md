# Baseline excerpt for `SampleManagement`

**Route:** `/inventory?tab=samples` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `SampleManagement`

* **Route:** Embedded in `/inventory?tab=samples`.
* **Features:**
  * `SampleForm` — request a sample (client, product, qty, expected return).
  * `SampleList` with operator-lane filter: `ALL`/`OUT`/`RETURN`; status filters (`REQUESTED`/`OUT`/`RETURNED`/`CONSUMED`/`LOST`).
  * `SampleReturnDialog`, `VendorShipDialog`, `LocationUpdateDialog`.
  * `ExpiringSamplesWidget` — samples past expected return.
* **tRPC:** `samples.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
