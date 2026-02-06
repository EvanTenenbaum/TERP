# TER-57 Beta Testing Checklist

## 1) Beta Tester Onboarding

1. Open staging: `https://terp-app-b9s35.ondigitalocean.app`.
2. Login with assigned role account.
3. Confirm dashboard access and module navigation.
4. Read Golden Flows runbook: `docs/golden-flows/GOLDEN_FLOWS_RUNBOOK.md`.

## 2) Test Accounts

| Role        | Email                   | Password    |
| ----------- | ----------------------- | ----------- |
| Super Admin | qa.superadmin@terp.test | TerpQA2026! |
| Sales Rep   | qa.salesrep@terp.test   | TerpQA2026! |
| Inventory   | qa.inventory@terp.test  | TerpQA2026! |
| Auditor     | qa.auditor@terp.test    | TerpQA2026! |

## 3) Expected Behavior Checklist by Golden Flow

- [ ] GF-001 Direct Intake: rows render, totals update, submit succeeds.
- [ ] GF-002 Procure to Pay: product dropdown populated, PO lifecycle transitions.
- [ ] GF-003 Order to Cash: order->invoice->payment->fulfillment completes.
- [ ] GF-004 Invoice/Payment: PDF generates quickly, payment posts.
- [ ] GF-005 Pick-Pack: pick task completes and updates inventory.
- [ ] GF-006 Client Ledger: top debtors/vendors show non-empty data when balances exist.
- [ ] GF-007 Inventory Mgmt: filters and valuation behave correctly.
- [ ] GF-008 Sample Request: searchable product selector stores correct `productId`.

## 4) Bug Reporting Template

Use `docs/beta/BUG_REPORT_TEMPLATE.md`.

## 5) Feedback Collection Template

Use `docs/beta/FEEDBACK_FORM_TEMPLATE.md`.
