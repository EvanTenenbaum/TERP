# TER-42 Verification - Order-to-Cash End-to-End

## Goal

Provide an executable checklist for full O2C flow verification and defect capture.

## End-to-End Steps

1. Login as `qa.salesrep@terp.test`.
2. Create/select client.
3. Create sales order with >=2 line items.
4. Confirm order.
5. Generate invoice from order.
6. Record partial payment.
7. Record final payment.
8. Fulfill/ship order.
9. Validate GL entries (AR/Revenue, Cash/AR).

## Expected Results

- Status transitions complete without blocking errors.
- Amount due updates correctly after each payment.
- GL entries are balanced and tied to order/invoice/payment references.

## Defect Capture Template

- Step failed:
- Error message:
- Role:
- Browser:
- Screenshot link:
- Suggested fix:

## Environment Limitation

This container does not provide privileged production/staging log access, so final operational sign-off remains with QA.
