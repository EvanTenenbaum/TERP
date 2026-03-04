# QA Gate Declaration Template

Use this block in roadmap tasks, session files, prompts, and completion reports.

```text
Risk Tier: SAFE | STRICT | RED
Gate Profile: A/B/C/D/E (list executed gates)
Impact Mapping Confidence: high | medium | low
Evidence Bundle: docs/execution/<DATE>-<TASK_ID>/
Fallback Triggered: yes | no
Fallback Reason: <required when yes>
```

## Notes

- If impact mapping confidence is `low`, fallback smoke coverage is mandatory.
- `Risk Tier` cannot be SAFE for inventory/accounting/auth/migration work.
- Keep this declaration in sync with `docs/protocols/QA_GATING_EFFICIENCY_PROTOCOL_V1.md`.
