#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Release-train per-ticket fast loop (Balanced Ladder)

Usage:
  scripts/qa/release-train/ticket-fast-loop.sh \
    --ticket TER-488 \
    --risk STRICT \
    --targeted "pnpm test client/src/components/orders/LineItemTable.test.tsx" \
    [--targeted "pnpm test server/routers"] \
    [--changed-file client/src/components/orders/LineItemTable.tsx] \
    [--changed-files-file /tmp/changed-files.txt] \
    [--baseline-checkpoint-sha 5125f72b] \
    [--baseline-full-quartet-ref docs/roadmaps/checkpoint-bundles/checkpoint-2-.../bundle.md] \
    [--blast-radius-ref docs/roadmaps/...md] \
    [--rollback-ref docs/roadmaps/...md] \
    [--adversarial-note docs/roadmaps/...md] \
    [--local-base-url http://localhost:5173] \
    [--output-root qa-results/release-train]

Notes:
- Always runs `pnpm check`.
- Always runs `pnpm qa:test:smoke`.
- Uses scripts/ci/resolve-affected-tests.sh to derive domain QA suites.
- RED risk requires --rollback-ref and --adversarial-note.
USAGE
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
RESOLVER="${ROOT_DIR}/scripts/ci/resolve-affected-tests.sh"

TICKET=""
RISK="STRICT"
BASELINE_CHECKPOINT_SHA="PENDING"
BASELINE_FULL_QUARTET_REF="PENDING (set at checkpoint close)"
BLAST_RADIUS_REF="PENDING"
ROLLBACK_REF="PENDING"
ADVERSARIAL_NOTE=""
OUTPUT_ROOT="qa-results/release-train"
LOCAL_BASE_URL="${RELEASE_TRAIN_LOCAL_BASE_URL:-http://localhost:5173}"

TARGETED_CMDS=()
CHANGED_FILES=()
CHANGED_FILES_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ticket)
      TICKET="$2"
      shift 2
      ;;
    --risk)
      RISK="$2"
      shift 2
      ;;
    --targeted)
      TARGETED_CMDS+=("$2")
      shift 2
      ;;
    --changed-file)
      CHANGED_FILES+=("$2")
      shift 2
      ;;
    --changed-files-file)
      CHANGED_FILES_FILE="$2"
      shift 2
      ;;
    --baseline-checkpoint-sha)
      BASELINE_CHECKPOINT_SHA="$2"
      shift 2
      ;;
    --baseline-full-quartet-ref)
      BASELINE_FULL_QUARTET_REF="$2"
      shift 2
      ;;
    --blast-radius-ref)
      BLAST_RADIUS_REF="$2"
      shift 2
      ;;
    --rollback-ref)
      ROLLBACK_REF="$2"
      shift 2
      ;;
    --adversarial-note)
      ADVERSARIAL_NOTE="$2"
      shift 2
      ;;
    --output-root)
      OUTPUT_ROOT="$2"
      shift 2
      ;;
    --local-base-url)
      LOCAL_BASE_URL="$2"
      shift 2
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

if [[ -z "${TICKET}" ]]; then
  echo "ERROR: --ticket is required" >&2
  usage >&2
  exit 1
fi

if [[ "${RISK}" != "SAFE" && "${RISK}" != "STRICT" && "${RISK}" != "RED" ]]; then
  echo "ERROR: --risk must be SAFE, STRICT, or RED" >&2
  exit 1
fi

if [[ "${RISK}" == "RED" ]]; then
  if [[ -z "${ADVERSARIAL_NOTE}" || ! -f "${ADVERSARIAL_NOTE}" ]]; then
    echo "ERROR: RED risk requires --adversarial-note <existing-file>" >&2
    exit 1
  fi
  if [[ "${ROLLBACK_REF}" == "PENDING" || -z "${ROLLBACK_REF}" ]]; then
    echo "ERROR: RED risk requires --rollback-ref" >&2
    exit 1
  fi
fi

if [[ ! -x "${RESOLVER}" ]]; then
  echo "ERROR: resolver script not executable: ${RESOLVER}" >&2
  exit 1
fi

if [[ -n "${CHANGED_FILES_FILE}" ]]; then
  if [[ ! -f "${CHANGED_FILES_FILE}" ]]; then
    echo "ERROR: changed files file does not exist: ${CHANGED_FILES_FILE}" >&2
    exit 1
  fi
  while IFS= read -r line; do
    [[ -n "${line}" ]] && CHANGED_FILES+=("${line}")
  done < "${CHANGED_FILES_FILE}"
fi

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  while IFS= read -r line; do
    [[ -n "${line}" ]] && CHANGED_FILES+=("${line}")
  done < <(git -C "${ROOT_DIR}" diff --name-only HEAD~1..HEAD)
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="${ROOT_DIR}/${OUTPUT_ROOT}/${TICKET}/${TIMESTAMP}"
mkdir -p "${RUN_DIR}"

CHANGED_FILE_LIST="${RUN_DIR}/changed-files.txt"
: > "${CHANGED_FILE_LIST}"
for file_path in "${CHANGED_FILES[@]}"; do
  printf '%s\n' "${file_path}" >> "${CHANGED_FILE_LIST}"
done

RESOLVER_OUTPUT="$(cat "${CHANGED_FILE_LIST}" | "${RESOLVER}" -)"
printf '%s\n' "${RESOLVER_OUTPUT}" > "${RUN_DIR}/resolver-output.txt"

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

DOMAIN_CMDS=("pnpm qa:test:smoke")

add_domain_cmd() {
  local cmd="$1"
  local existing
  for existing in "${DOMAIN_CMDS[@]}"; do
    if [[ "${existing}" == "${cmd}" ]]; then
      return
    fi
  done
  DOMAIN_CMDS+=("${cmd}")
}

if [[ "${RESOLVER_OUTPUT}" != "SKIP" && "${RESOLVER_OUTPUT}" != "SMOKE" ]]; then
  for spec in ${RESOLVER_OUTPUT}; do
    case "${spec}" in
      *accounting*)
        add_domain_cmd "pnpm qa:test:accounting"
        ;;
      *client*)
        add_domain_cmd "pnpm qa:test:clients"
        ;;
      *inventory*)
        add_domain_cmd "pnpm qa:test:inventory"
        ;;
      *order*|*pick-pack*|*returns*|*sales-sheet*|*control-action*)
        add_domain_cmd "pnpm qa:test:orders"
        ;;
      *)
        ;;
    esac
  done
fi

run_cmd "check" "pnpm check"

index=1
for targeted in "${TARGETED_CMDS[@]}"; do
  run_cmd "targeted-${index}" "${targeted}"
  index=$((index + 1))
done

index=1
for qa_cmd in "${DOMAIN_CMDS[@]}"; do
  run_cmd "qa-${index}" "PLAYWRIGHT_BASE_URL='${LOCAL_BASE_URL}' SKIP_E2E_SETUP=1 ${qa_cmd}"
  index=$((index + 1))
done

EVIDENCE_FILE="${RUN_DIR}/evidence-packet-v2.md"
{
  echo "# Ticket Evidence Packet v2"
  echo
  echo "- ticket: ${TICKET}"
  echo "- risk: ${RISK}"
  echo "- generatedAt: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- baseline_checkpoint_sha: ${BASELINE_CHECKPOINT_SHA}"
  echo "- baseline_full_quartet_ref: ${BASELINE_FULL_QUARTET_REF}"
  echo "- ticket_delta_checks_ref: ${RUN_DIR}"
  echo "- blast_radius_ref: ${BLAST_RADIUS_REF}"
  echo "- rollback_ref: ${ROLLBACK_REF}"
  echo
  echo "## Resolver"
  echo
  echo "- changed_files: ${CHANGED_FILE_LIST}"
  echo "- resolver_output: ${RESOLVER_OUTPUT}"
  echo
  echo "## Command Results"
  echo
  echo "| Label | Exit | Log |"
  echo "| --- | ---: | --- |"
  for i in "${!RUN_LABELS[@]}"; do
    echo "| ${RUN_LABELS[$i]} | ${RUN_STATUSES[$i]} | ${RUN_LOGS[$i]} |"
  done
  echo
  if [[ "${RISK}" == "RED" ]]; then
    echo "## RED Adversarial Evidence"
    echo
    echo "- adversarial_note: ${ADVERSARIAL_NOTE}"
    echo "- rollback_ref: ${ROLLBACK_REF}"
    echo
  fi
} > "${EVIDENCE_FILE}"

if [[ ${OVERALL_FAILURES} -gt 0 ]]; then
  echo "Ticket fast loop failed (${OVERALL_FAILURES} command failures)." >&2
  echo "Evidence file: ${EVIDENCE_FILE}"
  exit 1
fi

echo "Ticket fast loop passed."
echo "Evidence file: ${EVIDENCE_FILE}"
