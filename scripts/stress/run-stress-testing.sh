#!/usr/bin/env bash
set -euo pipefail

# STX-003/STX-008 canonical stress orchestrator
# Lane order: preflight -> browser -> api load -> invariants strict -> verdict
# Contract reference: docs/testing/STRESS_TESTING_RUNBOOK.md

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="peak"
ENV_NAME="staging"
TARGET_URL="https://terp-staging-yicld.ondigitalocean.app"
RUN_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE="${2:-peak}"
      shift 2
      ;;
    --profile=*)
      PROFILE="${1#--profile=}"
      shift
      ;;
    --profile\\=*)
      PROFILE="${1#--profile\\=}"
      shift
      ;;
    --env)
      ENV_NAME="${2:-staging}"
      shift 2
      ;;
    --env=*)
      ENV_NAME="${1#--env=}"
      shift
      ;;
    --env\\=*)
      ENV_NAME="${1#--env\\=}"
      shift
      ;;
    --output-dir)
      RUN_DIR="${2:-}"
      shift 2
      ;;
    --output-dir=*)
      RUN_DIR="${1#--output-dir=}"
      shift
      ;;
    --output-dir\\=*)
      RUN_DIR="${1#--output-dir\\=}"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: bash scripts/stress/run-stress-testing.sh [--env staging] [--profile smoke|peak|soak] [--output-dir DIR]" >&2
      exit 1
      ;;
  esac
done

if [[ "$ENV_NAME" != "staging" ]]; then
  echo "Only --env staging is supported by this command contract" >&2
  exit 1
fi

if [[ -z "$RUN_DIR" ]]; then
  RUN_DIR="$ROOT_DIR/qa-results/stress/$(date +%Y%m%d-%H%M%S)-${PROFILE}"
fi

mkdir -p "$RUN_DIR"

export NO_REPAIR=1
export STRESS_TARGET_URL="$TARGET_URL"

PROFILES_FILE="$ROOT_DIR/scripts/stress/profiles.json"

if [[ ! -f "$PROFILES_FILE" ]]; then
  echo "Missing profiles config: $PROFILES_FILE" >&2
  exit 1
fi

PROFILE_ENV="$(node -e '
const fs=require("fs");
const f=process.argv[1];
const profile=process.argv[2];
const p=JSON.parse(fs.readFileSync(f,"utf8"));
if(!p[profile]) { console.error(`Unknown profile: ${profile}`); process.exit(2); }
const cfg=p[profile];
const th=p.thresholds[cfg.thresholdSet];
const rows=[
  `STRESS_DURATION=${cfg.duration}`,
  `STRESS_VUS=${cfg.vus}`,
  `STRESS_RAMP=${cfg.ramp}`,
  `STRESS_P95_MS=${th.p95Ms}`,
  `STRESS_ERROR_RATE=${th.errorRate}`,
  `STRESS_ABORT_ON_FAIL=${th.abortOnFail}`
];
process.stdout.write(rows.join("\n"));
' "$PROFILES_FILE" "$PROFILE")"

eval "$PROFILE_ENV"

BLOCKERS=()
add_blocker() {
  BLOCKERS+=("$1")
}

write_blockers_file() {
  if (( ${#BLOCKERS[@]} == 0 )); then
    return
  fi
  {
    echo "# Stress Run Blockers"
    echo ""
    echo "Run Directory: $RUN_DIR"
    echo "Profile: $PROFILE"
    echo "Target: $TARGET_URL"
    echo ""
    for b in "${BLOCKERS[@]}"; do
      echo "- $b"
    done
  } > "$RUN_DIR/BLOCKERS.md"
}

finalize_verdict() {
  local status="$1"
  local reason="$2"
  write_blockers_file

  local blockers_json="[]"
  if (( ${#BLOCKERS[@]} > 0 )); then
    blockers_json="$(printf '%s\n' "${BLOCKERS[@]}" | node -e 'const fs=require("fs");const v=fs.readFileSync(0,"utf8").trim().split(/\n/).filter(Boolean);process.stdout.write(JSON.stringify(v));')"
  fi

  cat > "$RUN_DIR/verdict.json" <<JSON
{
  "status": "$status",
  "profile": "$PROFILE",
  "target": "$TARGET_URL",
  "noRepair": true,
  "artifactsDir": "$RUN_DIR",
  "blockers": $blockers_json,
  "reason": "$reason"
}
JSON

  {
    echo "# Stress Verdict"
    echo ""
    echo "- Status: **$status**"
    echo "- Profile: \`$PROFILE\`"
    echo "- Target: \`$TARGET_URL\`"
    echo "- NO_REPAIR: \`1\`"
    echo "- Artifacts: \`$RUN_DIR\`"
    echo ""
    if (( ${#BLOCKERS[@]} > 0 )); then
      echo "## Blockers"
      for b in "${BLOCKERS[@]}"; do
        echo "- $b"
      done
      echo ""
    fi
    echo "## Reason"
    echo "$reason"
  } > "$RUN_DIR/VERDICT.md"
}

run_lane() {
  local lane_name="$1"
  local lane_cmd="$2"
  local lane_log="$3"

  echo "== Lane: $lane_name =="
  if ! bash -lc "$lane_cmd" >"$lane_log" 2>&1; then
    add_blocker "$lane_name failed (see $(basename "$lane_log"))"
    finalize_verdict "BLOCKED" "$lane_name failed"
    exit 1
  fi
}

# Lane 1: preflight
run_lane \
  "preflight" \
  "cd '$ROOT_DIR' && bash scripts/stress/preflight.sh --env '$ENV_NAME' --target-url '$TARGET_URL' --output-dir '$RUN_DIR'" \
  "$RUN_DIR/preflight.log"

# Lane 2: browser critical
run_lane \
  "browser-critical" \
  "cd '$ROOT_DIR' && PLAYWRIGHT_BASE_URL='$TARGET_URL' SKIP_E2E_SETUP=1 pnpm test:staging-critical" \
  "$RUN_DIR/browser-lane.log"

# Lane 3: API load
K6_CMD=""
K6_SUMMARY_HOST="$RUN_DIR/k6-summary.json"
if command -v k6 >/dev/null 2>&1; then
  K6_CMD="cd '$ROOT_DIR' && STRESS_TARGET_URL='$TARGET_URL' STRESS_DURATION='$STRESS_DURATION' STRESS_VUS='$STRESS_VUS' STRESS_RAMP='$STRESS_RAMP' STRESS_P95_MS='$STRESS_P95_MS' STRESS_ERROR_RATE='$STRESS_ERROR_RATE' STRESS_ABORT_ON_FAIL='$STRESS_ABORT_ON_FAIL' k6 run --summary-export '$K6_SUMMARY_HOST' scripts/stress/staging-mixed-traffic.k6.js"
elif command -v docker >/dev/null 2>&1; then
  REL_RUN_DIR="${RUN_DIR#"$ROOT_DIR"/}"
  K6_SUMMARY_CONTAINER="/work/$REL_RUN_DIR/k6-summary.json"
  K6_CMD="cd '$ROOT_DIR' && docker run --rm -i -e STRESS_TARGET_URL='$TARGET_URL' -e STRESS_DURATION='$STRESS_DURATION' -e STRESS_VUS='$STRESS_VUS' -e STRESS_RAMP='$STRESS_RAMP' -e STRESS_P95_MS='$STRESS_P95_MS' -e STRESS_ERROR_RATE='$STRESS_ERROR_RATE' -e STRESS_ABORT_ON_FAIL='$STRESS_ABORT_ON_FAIL' -v '$ROOT_DIR':/work -w /work grafana/k6 run --summary-export '$K6_SUMMARY_CONTAINER' scripts/stress/staging-mixed-traffic.k6.js"
else
  add_blocker "No k6 or docker runtime available for API load lane"
  finalize_verdict "BLOCKED" "API load lane unavailable"
  exit 1
fi
run_lane "api-load" "$K6_CMD" "$RUN_DIR/api-load.log"

# Lane 4: invariants strict
run_lane \
  "invariants-strict" \
  "cd '$ROOT_DIR' && pnpm gate:invariants:strict" \
  "$RUN_DIR/invariants.log"

# Lane 5: bundle + verdict
if ! tar -czf "$RUN_DIR/artifacts.tgz" -C "$RUN_DIR" . >/dev/null 2>&1; then
  add_blocker "artifact bundle creation failed"
  finalize_verdict "BLOCKED" "artifact bundle creation failed"
  exit 1
fi

finalize_verdict "PASS" "All lanes passed"
echo "Stress run passed. Artifacts: $RUN_DIR"
exit 0
