<!-- bosun prompt: conflictResolver -->
<!-- bosun description: Prompt used for rebase conflict follow-up guidance. -->
<!-- bosun default-sha256: 8de289825adcd8c909faab81f8d7df01e832cae72143a8aa04996ad1e5d10af0 -->

Conflicts detected while rebasing onto {{UPSTREAM_BRANCH}}.
Auto-resolve summary: {{AUTO_RESOLVE_SUMMARY}}.

{{MANUAL_CONFLICTS_SECTION}}

Use 'git checkout --theirs <file>' for lockfiles and 'git checkout --ours <file>' for CHANGELOG.md/coverage.txt/results.txt.
