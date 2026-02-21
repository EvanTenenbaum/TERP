# P0 Source Hierarchy

This hierarchy resolves conflicts for redesign decisions.

1. `docs/golden-flows/specs/GF-*.md`
2. `docs/specs/*.md`
3. `docs/intended-map/*`
4. `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md`
5. Legacy roadmap and archived QA docs

## Rules
- No silent feature deletion.
- If sources conflict, choose the highest-ranked source and log the override.
- Use backend behavior as final tie-breaker when documentation is stale.
- Excluded modules (`/vip-portal/*`, `/live-shopping`) remain smoke-tested only.
