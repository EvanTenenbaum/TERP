#!/usr/bin/env bash
set -euo pipefail

# Generate STRESS_AUTH_TOKEN from staging login cookie without persisting secrets.
# Requires STRESS_ADMIN_EMAIL + STRESS_ADMIN_PASSWORD.

TARGET_URL="${STRESS_TARGET_URL:-https://terp-staging-yicld.ondigitalocean.app}"
RAW_OUTPUT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --raw)
      RAW_OUTPUT=1
      shift
      ;;
    --target-url)
      TARGET_URL="${2:-$TARGET_URL}"
      shift 2
      ;;
    --target-url=*)
      TARGET_URL="${1#--target-url=}"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: bash scripts/stress/generate-auth-token.sh [--raw] [--target-url URL]" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${STRESS_ADMIN_EMAIL:-}" || -z "${STRESS_ADMIN_PASSWORD:-}" ]]; then
  echo "Missing credentials: set STRESS_ADMIN_EMAIL and STRESS_ADMIN_PASSWORD" >&2
  exit 1
fi

headers_file="$(mktemp)"
body_file="$(mktemp)"
trap 'rm -f "$headers_file" "$body_file"' EXIT

payload="$(printf '{"username":"%s","password":"%s"}' "$STRESS_ADMIN_EMAIL" "$STRESS_ADMIN_PASSWORD")"
status_code="$(
  curl -sS -o "$body_file" -D "$headers_file" -w "%{http_code}" \
    -X POST "$TARGET_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    --data "$payload"
)"

if [[ "$status_code" != "200" ]]; then
  echo "Login failed: HTTP $status_code" >&2
  cat "$body_file" >&2
  exit 1
fi

cookie_line="$(grep -i '^set-cookie: terp_session=' "$headers_file" | head -n1 || true)"
if [[ -z "$cookie_line" ]]; then
  echo "Missing terp_session cookie in login response headers" >&2
  exit 1
fi

token="$(printf '%s' "$cookie_line" | sed -E 's/^set-cookie:[[:space:]]*terp_session=([^;]+);.*$/\1/I')"
if [[ -z "$token" ]]; then
  echo "Unable to parse terp_session cookie token" >&2
  exit 1
fi

if [[ "$RAW_OUTPUT" -eq 1 ]]; then
  printf '%s\n' "$token"
else
  printf "export STRESS_AUTH_TOKEN='%s'\n" "$token"
fi
