#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/Users/evantenenbaum/spec-erp-docker/TERP/TERP"
BOSUN_HOME_DEFAULT="$REPO_ROOT/.bosun-terp"
export BOSUN_HOME="${BOSUN_HOME:-$BOSUN_HOME_DEFAULT}"
export BOSUN_DIR="$BOSUN_HOME"
mkdir -p "$BOSUN_HOME"

cd "$REPO_ROOT"

ACTION="${1:-help}"
shift || true

require_routed() {
  if [[ "${OPENCLAW_ROUTED_BOSUN:-}" != "1" ]]; then
    cat >&2 <<'MSG'
Refusing to run unmanaged TERP Bosun command.
This wrapper is for OpenClaw-routed Bosun use only.
Set OPENCLAW_ROUTED_BOSUN=1 when Mickey intentionally launches it.
MSG
    exit 64
  fi
}

case "$ACTION" in
  setup)
    require_routed
    exec bosun --setup "$@"
    ;;
  doctor)
    require_routed
    exec bosun --doctor "$@"
    ;;
  run|shell)
    require_routed
    exec bosun "$@"
    ;;
  status)
    require_routed
    exec bosun --daemon-status "$@"
    ;;
  env)
    printf 'REPO_ROOT=%s\nBOSUN_HOME=%s\nOPENCLAW_ROUTED_BOSUN=%s\n' "$REPO_ROOT" "$BOSUN_HOME" "${OPENCLAW_ROUTED_BOSUN:-0}"
    ;;
  help|*)
    cat <<USAGE
TERP Bosun wrapper

Usage:
  OPENCLAW_ROUTED_BOSUN=1 scripts/agent/terp-bosun.sh setup
  OPENCLAW_ROUTED_BOSUN=1 scripts/agent/terp-bosun.sh doctor
  OPENCLAW_ROUTED_BOSUN=1 scripts/agent/terp-bosun.sh run [args]
  OPENCLAW_ROUTED_BOSUN=1 scripts/agent/terp-bosun.sh status
  scripts/agent/terp-bosun.sh env

Notes:
- Scoped to the TERP repo only.
- Uses repo-local-ish Bosun state at .bosun-terp by default.
- Intended for OpenClaw-routed runs only.
- Unmanaged daemon/start/stop helpers are intentionally not exposed here.
USAGE
    ;;
esac
