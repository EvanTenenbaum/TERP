# V4 QA Checklist

## Macro Gates
- [ ] In-scope parity preserved across all route families
- [ ] Exclusions respected (`/vip-portal/*`, `/live-shopping`)
- [ ] No DB schema changes required
- [ ] Feature-flag rollback path validated

## Micro UX Gates
- [ ] No critical action/input requires horizontal scrolling
- [ ] Grid column show/hide/reorder/reset persists
- [ ] Dense/Comfortable/Visual modes persist
- [ ] Activity Log drawer accessible and complete
- [ ] Receive blocked by inline validation errors
- [ ] Post-receive corrections create movements (no direct mutation)

## Flow Validation
- [ ] PO partial fulfillment and subset intake flow
- [ ] SKU generated only on Receive
- [ ] Optimistic lock conflict handling path
- [ ] Void intake reversals verified
- [ ] Legacy redirects functional and tracked

## Evidence
- [ ] Typecheck + tests pass
- [ ] Route manifest + parity reconciliation generated
- [ ] Seed verification passed
- [ ] QA report published
