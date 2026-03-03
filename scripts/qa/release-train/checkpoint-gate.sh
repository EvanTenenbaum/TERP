#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Release-train checkpoint baseline gate + bundle generator

Usage:
  scripts/qa/release-train/checkpoint-gate.sh \
    --checkpoint 3 \
    --domains orders,inventory \
    [--tickets TER-488,TER-489,TER-490,TER-491] \
    [--staging-url https://terp-staging-...ondigitalocean.app] \
    [--output-root docs/roadmaps/checkpoint-bundles] \
    [--skip-runtime]

Behavior:
- Runs full quartet once: check, lint, test, build.
- Runs aggregated local QA domain suites + smoke.
- If staging URL is provided (and not --skip-runtime), runs runtime smoke/domain suites.
- Writes bundle markdown + per-command logs under output directory.
USAGE
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

CHECKPOINT=""
DOMAINS_CSV=""
TICKETS_CSV=""
STAGING_URL=""
OUTPUT_ROOT="docs/roadmaps/checkpoint-bundles"
SKIP_RUNTIME=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --checkpoint)
      CHECKPOINT="$2"
      shift 2
      ;;
    --domains)
      DOMAINS_CSV="$2"
      shift 2
      ;;
    --tickets)
      TICKETS_CSV="$2"
      shift 2
      ;;
    --staging-url)
      STAGING_URL="$2"
      shift 2
      ;;
    --output-root)
      OUTPUT_ROOT="$2"
      shift 2
      ;;
    --skip-runtime)
      SKIP_RUNTIME=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${CHECKPOINT}" ]]; then
  echo "ERROR: --checkpoint is required" >&2
  usage >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="${ROOT_DIR}/${OUTPUT_ROOT}/checkpoint-${CHECKPOINT}-${TIMESTAMP}"
mkdir -p "${RUN_DIR}"

BASELINE_SHA="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"

RUN_LABELS=()
RUN_STATUSES=()
RUN_LOGS=()
OVERALL_FAILURES=0

run_cmd() {
  local label="$1"
  local cmd="$2"
  local safe_label
  local log_file
  local status

  safe_label="$(echo "${label}" | tr ' /:' '___')"
  log_file="${RUN_DIR}/${safe_label}.log"

  echo "[run] ${label}: ${cmd}"

  set +e
  bash -lc "cd '${ROOT_DIR}' && ${cmd}" > "${log_file}" 2>&1
  status=$?
  set -e

  RUN_LABELS+=("${label}")
  RUN_STATUSES+=("${status}")
  RUN_LOGS+=("${log_file}")

  if [[ ${status} -ne 0 ]]; then
    OVERALL_FAILURES=$((OVERALL_FAILURES + 1))
    echo "  -> FAIL (see ${log_file})"
  else
    echo "  -> PASS"
  fi
}

split_csv() {
  local csv="$1"
  local out=()
  local item
  IFS=',' read -r -a out <<< "${csv}"
  for item in "${out[@]}"; do
    item="$(echo "${item}" | xargs)"
    [[ -n "${item}" ]] && echo "${item}"
  done
}

LOCAL_QA_CMDS=("pnpm qa:test:smoke")
for domain in $(split_csv "${DOMAINS_CSV}"); do
  case "${domain}" in
    orders|clients|inventory|accounting)
      LOCAL_QA_CMDS+=("pnpm qa:test:${domain}")
      ;;
    *)
      echo "WARN: unsupported domain '${domain}', skipping" >&2
      ;;
  esac
done

run_cmd "baseline-check" "pnpm check"
run_cmd "baseline-lint" "pnpm lint"
run_cmd "baseline-test" "pnpm test"
run_cmd "baseline-build" "pnpm build"

index=1
for qa_cmd in "${LOCAL_QA_CMDS[@]}"; do
  run_cmd "local-qa-${index}" "${qa_cmd}"
  index=$((index + 1))
done

if [[ -n "${STAGING_URL}" && ${SKIP_RUNTIME} -eq 0 ]]; then
  run_cmd "runtime-smoke" "PLAYWRIGHT_BASE_URL='${STAGING_URL}' SKIP_E2E_SETUP=1 pnpm qa:test:smoke"

  index=1
  for domain in $(split_csv "${DOMAINS_CSV}"); do
    case "${domain}" in
      orders|clients|inventory|accounting)
        run_cmd "runtime-${domain}-${index}" "PLAYWRIGHT_BASE_URL='${STAGING_URL}' SKIP_E2E_SETUP=1 pnpm qa:test:${domain}"
        index=$((index + 1))
        ;;
      *)
        ;;
    esac
  done
fi

BUNDLE_FILE="${RUN_DIR}/bundle.md"
{
  echo "# Checkpoint Verification Bundle"
  echo
  echo "- checkpoint: ${CHECKPOINT}"
  echo "- generatedAt: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- baseline_checkpoint_sha: ${BASELINE_SHA}"
  echo "- tickets: ${TICKETS_CSV:-PENDING}"
  echo "- domains: ${DOMAINS_CSV:-none}"
  echo "- staging_url: ${STAGING_URL:-none}"
  echo
  echo "## Baseline Quartet"
  echo
  echo "- baseline_full_quartet_ref:"
  echo "  - ${RUN_DIR}/baseline-check.log"
  echo "  - ${RUN_DIR}/baseline-lint.log"
  echo "  - ${RUN_DIR}/baseline-test.log"
  echo "  - ${RUN_DIR}/baseline-build.log"
  echo
  echo "## Command Results"
  echo
  echo "| Label | Exit | Log |"
  echo "| --- | ---: | --- |"
  for i in "${!RUN_LABELS[@]}"; do
    echo "| ${RUN_LABELS[$i]} | ${RUN_STATUSES[$i]} | ${RUN_LOGS[$i]} |"
  done
  echo
  echo "## Ticket Linking Fields"
  echo
  echo "- ticket_delta_checks_ref: ${RUN_DIR}"
  echo "- blast_radius_ref: PENDING"
  echo "- rollback_ref: PENDING (required for RED tickets)"
} > "${BUNDLE_FILE}"

if [[ ${OVERALL_FAILURES} -gt 0 ]]; then
  echo "Checkpoint gate failed (${OVERALL_FAILURES} command failures)." >&2
  echo "Bundle: ${BUNDLE_FILE}"
  exit 1
fi

echo "Checkpoint gate passed."
echo "Bundle: ${BUNDLE_FILE}"
