#!/usr/bin/env python3
"""Determine whether the overlapping final-batch work has landed on the shared branch.

Exit codes:
0 = Phase 2 gate is READY
1 = Phase 2 gate is BLOCKED
2 = script/config/runtime error
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import asdict, dataclass


DEFAULT_SHARED_BRANCH = "origin/feature/TER-880-fix-settings-users-page"
DEFAULT_OVERLAP_BRANCH = "origin/feature/TER-892-893-895-896-pilot-surface-fixes"


@dataclass
class PendingPatch:
    sha: str
    subject: str


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout.strip()


def parse_cherry(output: str) -> tuple[list[PendingPatch], list[PendingPatch]]:
    pending: list[PendingPatch] = []
    absorbed: list[PendingPatch] = []

    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        status, remainder = line[0], line[2:]
        parts = remainder.split(" ", 1)
        sha = parts[0]
        subject = parts[1] if len(parts) > 1 else ""

        patch = PendingPatch(sha=sha, subject=subject)
        if status == "+":
            pending.append(patch)
        elif status == "-":
            absorbed.append(patch)

    return pending, absorbed


def format_text(
    shared_branch: str,
    overlap_branch: str,
    shared_head: str,
    overlap_head: str,
    pending: list[PendingPatch],
    absorbed: list[PendingPatch],
) -> str:
    ready = not pending
    lines = [
        f"phase2_gate={'READY' if ready else 'BLOCKED'}",
        f"shared_branch={shared_branch}",
        f"shared_head={shared_head}",
        f"overlap_branch={overlap_branch}",
        f"overlap_head={overlap_head}",
        f"pending_patch_count={len(pending)}",
        f"absorbed_patch_count={len(absorbed)}",
    ]

    if pending:
        lines.append("pending_patches:")
        lines.extend([f"- {patch.sha} {patch.subject}" for patch in pending])
        lines.append(
            "next_action=wait_for_shared_branch_to_absorb_overlapping_final_batch"
        )
    else:
        lines.append("pending_patches: none")
        lines.append(
            "next_action=reanalyze_shared_branch_and_launch_phase2_residual_work"
        )

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Report whether the Phase 2 branch gate is ready."
    )
    parser.add_argument(
        "--shared-branch",
        default=DEFAULT_SHARED_BRANCH,
        help="Shared branch/ref to compare against",
    )
    parser.add_argument(
        "--overlap-branch",
        default=DEFAULT_OVERLAP_BRANCH,
        help="Overlapping branch/ref whose patches must land first",
    )
    parser.add_argument(
        "--no-fetch",
        action="store_true",
        help="Skip 'git fetch origin --quiet' before computing the gate",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON instead of text",
    )
    args = parser.parse_args()

    try:
        if not args.no_fetch:
            subprocess.run(
                ["git", "fetch", "origin", "--quiet"],
                check=True,
                capture_output=True,
                text=True,
            )

        shared_head = run_git(["rev-parse", "--short", args.shared_branch])
        overlap_head = run_git(["rev-parse", "--short", args.overlap_branch])
        cherry_output = run_git(
            ["cherry", "-v", args.shared_branch, args.overlap_branch]
        )
        pending, absorbed = parse_cherry(cherry_output)
    except Exception as exc:  # noqa: BLE001
        message = {"error": str(exc)}
        if args.json:
            print(json.dumps(message, indent=2))
        else:
            print(f"phase2_gate=ERROR\nerror={exc}")
        return 2

    payload = {
        "phase2_gate": "READY" if not pending else "BLOCKED",
        "shared_branch": args.shared_branch,
        "shared_head": shared_head,
        "overlap_branch": args.overlap_branch,
        "overlap_head": overlap_head,
        "pending_patch_count": len(pending),
        "absorbed_patch_count": len(absorbed),
        "pending_patches": [asdict(patch) for patch in pending],
        "absorbed_patches": [asdict(patch) for patch in absorbed],
        "next_action": (
            "reanalyze_shared_branch_and_launch_phase2_residual_work"
            if not pending
            else "wait_for_shared_branch_to_absorb_overlapping_final_batch"
        ),
    }

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(
            format_text(
                args.shared_branch,
                args.overlap_branch,
                shared_head,
                overlap_head,
                pending,
                absorbed,
            )
        )

    return 0 if not pending else 1


if __name__ == "__main__":
    sys.exit(main())
