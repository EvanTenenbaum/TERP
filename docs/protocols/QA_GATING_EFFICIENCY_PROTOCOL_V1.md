# TERP QA/Gating Efficiency Protocol (99/1 Model)

**Status:** Active default  
**Date:** 2026-03-03  
**Objective:** Preserve current release-risk detection while reducing cycle time and manual QA overhead.

---

## 1) Required Use

This is the default testing protocol for:

- roadmap plans
- agent task execution
- completion reports
- release-train QA decisions

If another QA process is used, the agent must state why and get explicit approval.

---

## 2) Gate Model

## Gate A: Pre-commit (<2 min)

- security pattern blocks
- actor attribution checks
- dangerous schema pattern checks
- changed-file lint/format

## Gate B: Pre-merge fast gate (6-10 min target)

- `pnpm check`
- changed-file lint
- impact-based unit/integration subset
- invariant smoke checks on affected critical domains

Rule: low-confidence impact mapping cannot skip checks; run smoke fallback.

## Gate C: Merge freshness

- merge queue on `main`
- required checks run on queue branch, not stale PR head

## Gate D: Post-merge deep gate

- broader integration + E2E packs
- schema regression and drift checks
- deploy health + behavior probes + log delta review

## Gate E: Nightly/weekly assurance

- nightly full E2E + schema drift + flake triage
- weekly adversarial deep pass + random full-suite replay sample

---

## 3) Risk Tiers

- `SAFE`: low blast radius; impact-based checks + smoke fallback
- `STRICT`: business logic/shared surfaces; targeted domain E2E required
- `RED`: auth/RBAC, accounting, inventory valuation, migrations; expanded invariants + rollback evidence required

Hard floor: inventory/accounting/auth/migrations cannot run as SAFE.

---

## 4) Anti-False-Green Controls

- no silent `SKIP` for required gates
- max one retry on blocking tests
- preserve first-failure artifacts
- track masked-failure rate (first fail, retry pass)
- unknown domain mapping defaults to smoke suite

---

## 5) Required QA Gate Declaration

Every task/session/completion must include:

```text
Risk Tier: SAFE | STRICT | RED
Gate Profile: A/B/C/D/E (executed gates)
Impact Mapping Confidence: high | medium | low
Evidence Bundle: docs/execution/<DATE>-<task>/...
```

Use template: `docs/templates/QA_GATE_DECLARATION_TEMPLATE.md`

---

## 6) TERP-Specific Non-Negotiables

- V4 QA gate evidence remains mandatory for STRICT/RED.
- Invariant checks required for money, inventory, permissions, and audit-sensitive flows.
- Deployment validation must include behavior probes, not only health endpoint checks.
- Security pattern controls remain hard-blocking in all tiers.

---

## 7) Success Metrics

- PR gate median duration: improve by at least 40%
- PR gate p95 duration: improve by at least 35%
- escaped P0/P1 defects: no increase
- impact-selection miss rate: under 2%
- masked-failure rate: under 1%
- queue wait p95: under 30 minutes

If efficacy regresses for two consecutive weeks, tighten gate depth immediately.

