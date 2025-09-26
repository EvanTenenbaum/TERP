#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000}"
ROLE_HEADER=( -H "x-user-role: ${ROLE:-SUPER_ADMIN}" )
USER_HEADER=( -H "x-user-id: ${USER_ID:-tester@example.com}" )
JSON_H=( -H 'Content-Type: application/json' )

step() { echo -e "\n==> $1"; }

step "Smoke: samples list (should succeed)"
curl -sS "${BASE_URL}/api/samples/list" "${ROLE_HEADER[@]}" | jq .success

step "Smoke: consignment sub-batches list (should succeed)"
curl -sS "${BASE_URL}/api/consignment/sub-batches/list" "${ROLE_HEADER[@]}" | jq .success

step "Smoke: AR aging CSV (should download CSV)"
curl -sS -D - "${BASE_URL}/api/finance/ar/aging.csv" "${ROLE_HEADER[@]}" -o /dev/null | grep -i 'content-type: text/csv' >/dev/null

echo "Optional create tests require IDs. Export env vars to run:"
echo "  export PRODUCT_ID=... VENDOR_ID=... CUSTOMER_ID=... BATCH_ID=... QUOTE_ID=..."

if [[ "${PRODUCT_ID:-}" != "" && "${CUSTOMER_ID:-}" != "" ]]; then
  step "Samples outgoing (product/customer)"
  curl -sS -X POST "${BASE_URL}/api/samples/outgoing" "${ROLE_HEADER[@]}" "${USER_HEADER[@]}" "${JSON_H[@]}" \
    -d "{\"productId\":\"$PRODUCT_ID\",\"qty\":1,\"customerId\":\"$CUSTOMER_ID\"}" | jq .success
fi

if [[ "${PRODUCT_ID:-}" != "" && "${VENDOR_ID:-}" != "" ]]; then
  step "Samples incoming (product/vendor)"
  curl -sS -X POST "${BASE_URL}/api/samples/incoming" "${ROLE_HEADER[@]}" "${USER_HEADER[@]}" "${JSON_H[@]}" \
    -d "{\"productId\":\"$PRODUCT_ID\",\"vendorId\":\"$VENDOR_ID\",\"qty\":1}" | jq .success
fi

if [[ "${BATCH_ID:-}" != "" ]]; then
  step "Consignment sub-batch create (requires consignment batch)"
  curl -sS -X POST "${BASE_URL}/api/consignment/sub-batches" "${ROLE_HEADER[@]}" "${USER_HEADER[@]}" "${JSON_H[@]}" \
    -d "{\"batchId\":\"$BATCH_ID\",\"tierName\":\"TIER_A\",\"qtyAllocated\":1}" | jq .success || true
fi

if [[ "${AR_ID:-}" != "" ]]; then
  step "AR bad-debt write-off (clamped)"
  curl -sS -X POST "${BASE_URL}/api/finance/ar/bad-debt" "${ROLE_HEADER[@]}" "${USER_HEADER[@]}" "${JSON_H[@]}" \
    -d "{\"arId\":\"$AR_ID\",\"amountCents\":100,\"reason\":\"smoke\"}" | jq .success
fi

if [[ "${QUOTE_ID:-}" != "" ]]; then
  step "Sales-sheet PDF (HTTP 200, application/pdf)"
  curl -sS -D - "${BASE_URL}/api/sales-sheets/${QUOTE_ID}/pdf" "${ROLE_HEADER[@]}" -o /dev/null | grep -i 'content-type: application/pdf' >/dev/null
fi

echo "Smoke tests completed."
