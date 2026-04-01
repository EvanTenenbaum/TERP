#!/bin/bash

set -euo pipefail

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
common_git_dir=$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")

if [[ "$common_git_dir" != /* ]]; then
  common_git_dir="$repo_root/$common_git_dir"
fi

canonical_root=$(cd "$(dirname "$common_git_dir")" && pwd)

echo "Preparing TERP agent tools in: $repo_root"
echo "Canonical repo root: $canonical_root"

if [[ -L "$repo_root/node_modules" && ! -e "$repo_root/node_modules" ]]; then
  rm -f "$repo_root/node_modules"
fi

ensure_install_in_root() {
  local target_root="$1"

  if [[ -d "$target_root/node_modules" && -x "$target_root/node_modules/.bin/tsx" ]]; then
    return 0
  fi

  echo "Installing dependencies in: $target_root"
  (
    cd "$target_root"
    pnpm install --frozen-lockfile
  )
}

if [[ ! -e "$repo_root/node_modules" ]]; then
  if [[ "$repo_root" != "$canonical_root" ]]; then
    ensure_install_in_root "$canonical_root"
    ln -s "$canonical_root/node_modules" "$repo_root/node_modules"
    echo "Linked worktree node_modules -> $canonical_root/node_modules"
  else
    ensure_install_in_root "$repo_root"
  fi
fi

required_bins=(tsx playwright vitest tsc)
missing_bins=()

for bin_name in "${required_bins[@]}"; do
  if [[ ! -x "$repo_root/node_modules/.bin/$bin_name" ]]; then
    missing_bins+=("$bin_name")
  fi
done

if (( ${#missing_bins[@]} > 0 )); then
  echo "Missing required local binaries: ${missing_bins[*]}" >&2
  exit 1
fi

echo "TERP agent tools ready."
