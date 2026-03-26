# Terminology Gate Investigation Prompt

> **For the agent receiving this:** This is a read-only investigation task. You will not modify any source files.

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing the ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not summarise findings until every analysis step has been run and its output shown.
3. **NO SILENT FAILURE.** If any command errors, stop and report it exactly. Do not work around it.
4. **ACTUALLY READ FILES BEFORE DESCRIBING THEM.** Do not paraphrase a script from memory. Read the current file on disk.
5. **DO NOT MAKE CODE CHANGES.** This task is investigation and triage only. No edits to source files.

---

## Mission Brief

`pnpm gate:terminology` is a CI merge gate that checks for deprecated naming conventions across the repo. A recent full QA run (2026-03-25) reported it as **hard red: 1265 files scanned, 1594 total violations (1503 errors, 91 warnings)**. The engineering team has not seen this report before and needs to understand what it is, why it fails, and what the right remediation path looks like before touching any code.

Your job: investigate thoroughly, produce a triage report, and recommend a concrete plan. **You will not change any source files.**

---

## Context You Must Read First

Before doing anything else, read these files in full:

- `scripts/terminology-drift-audit.sh` — the gate script (understand every flag: `--strict`, `--changed`, `--staged`, the `DEPRECATED_TERMS` array, the `EXEMPT_PATTERNS` array, what `error` vs `warning` severity means)
- `docs/terminology/TERMINOLOGY_BIBLE.md` — the canonical naming reference (if it exists; note if it doesn't)
- `CLAUDE.md` (repo root) — the Party Model section explains _why_ `vendor` is deprecated

---

## Task 1: Understand the Gate

**What**: Read and explain exactly what `gate:terminology` does and why the `--strict` flag causes 1594 violations when normal mode would be much lower.

**Acceptance Criteria**:

- [ ] Explain the difference between `--strict` mode (no exemptions) and the default mode (with `EXEMPT_PATTERNS`)
- [ ] List every deprecated term being checked, its canonical replacement, its family, and its severity (error vs warning)
- [ ] List every file/path in the current `EXEMPT_PATTERNS` list
- [ ] Explain why the gate is run with `--strict` in `package.json`

🔒 **GATE 1**: Show output of:

```bash
grep -A3 '"gate:terminology"' package.json
```

and

```bash
wc -l scripts/terminology-drift-audit.sh && head -60 scripts/terminology-drift-audit.sh
```

---

## Task 2: Quantify Violations by Term Family

**What**: Break down the 1594 violations by which deprecated term family they belong to, so the team knows where the debt is concentrated.

Run:

```bash
bash scripts/terminology-drift-audit.sh --strict 2>&1 | grep "^\[error\]\|^\[warning\]" | sed 's/.*use .* instead of //' | sort | uniq -c | sort -rn | head -30
```

Then run a per-file breakdown for the top-offending term:

```bash
bash scripts/terminology-drift-audit.sh --strict 2>&1 | grep "^\[error\]" | awk -F'|' '{print $1}' | sed 's/.*\[error\] //' | sort | uniq -c | sort -rn | head -20
```

**Acceptance Criteria**:

- [ ] Show count of violations per deprecated term family (vendor/intake/InventoryItem/etc.)
- [ ] Show the top 20 files by error count
- [ ] Identify what percentage of the 1503 errors come from `\bVendor\b` / `\bvendor\b` vs other families

🔒 **GATE 2**: Paste the actual output of both commands above.

---

## Task 3: Categorise by File Type

**What**: Classify the top offending files into three buckets:

**Bucket A — Clearly legacy / migration code** (safe to add to `EXEMPT_PATTERNS`):

- Files explicitly listed as deprecated in `CLAUDE.md` (e.g. `server/vendorContextDb.ts`, `server/vendorSupplyDb.ts`)
- Files under `drizzle/` (schema and migration SQL)
- Files already in the exemption list that `--strict` overrides

**Bucket B — Actively maintained code that contains the old terms** (genuine drift, needs renaming):

- Any `client/src/components/` file recently modified
- Any `server/routers/` file that is NOT in the legacy category
- Test files that use the old terms in test data or assertions

**Bucket C — Uncertain** (needs Evan's decision before touching):

- Files you can't confidently categorise without domain context

For each bucket, show a sample of 3–5 representative files.

Run:

```bash
bash scripts/terminology-drift-audit.sh --strict 2>&1 | grep "^\[error\]" | awk -F'|' '{print $1}' | sed 's/.*\[error\] //' | sort -u | grep -E "vendor|Vendor|inventoryDb|schema|drizzle" | head -20
```

**Acceptance Criteria**:

- [ ] Bucket A, B, C each populated with representative files and a count estimate
- [ ] Total estimated violations per bucket (even rough percentages are fine)

🔒 **GATE 3**: Show the command output and your three-bucket classification.

---

## Task 4: Check What Our Branch Introduced

**What**: Determine whether the current working branch adds any net-new terminology violations vs `main`.

```bash
bash scripts/terminology-drift-audit.sh --changed 2>&1 | tail -20
```

**Acceptance Criteria**:

- [ ] Show exact output of `--changed` run
- [ ] Confirm whether the current branch adds net-new violations or zero

🔒 **GATE 4**: Paste the `--changed` output.

---

## Task 5: Produce the Triage Report

Write a structured report with these sections:

### 5.1 — What is this gate?

One paragraph plain-English explanation of the terminology gate and the Party Model naming conventions it enforces. No jargon. Evan is reading this for the first time.

### 5.2 — Why 1594 violations?

Explain the gap between strict mode (1594) and the actual new drift on the current branch. Make clear whether this is an existing repo-wide problem or something newly introduced.

### 5.3 — Violation breakdown

Table: Term Family | Error Count | % of Total | Bucket (A/B/C)

### 5.4 — Risk assessment

For each bucket:

- **Bucket A (legacy)**: Safe to add to exemptions — these files exist to support the deprecated terminology during the migration period
- **Bucket B (drift)**: Needs renaming — list specific files and what the rename would be
- **Bucket C (uncertain)**: Blocked on Evan's decision

### 5.5 — Recommended action plan

Three options ordered by effort:

**Option 1 — Expand exemptions (1–2 hours):** Add Bucket A files to `EXEMPT_PATTERNS`. Closes the majority of strict-mode violations without touching production code. The gate then only fails on genuinely new drift.

**Option 2 — Fix Bucket B drift (~1 day):** Rename actively-maintained files in Bucket B. File-by-file with `pnpm check` after each rename.

**Option 3 — Wholesale migration (multi-day):** Rename everything including deprecated service files. Only if deprecated files are being actively extended.

Include a recommendation for which option to start with and why.

---

## Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

- [ ] All 4 verification gates passed (command outputs pasted inline)
- [ ] `docs/terminology/TERMINOLOGY_BIBLE.md` read (or noted as missing)
- [ ] Three-bucket classification completed with file examples
- [ ] Triage report sections 5.1–5.5 all present
- [ ] `--changed` confirms current branch adds zero net-new error-level violations
- [ ] No source files were modified during this investigation
- [ ] `pnpm check` still passes (run at end to confirm nothing was accidentally touched):
  ```bash
  pnpm check 2>&1 | tail -3
  ```

---

## MANDATORY RULES — REPEATED

1. No phantom verification — actual command output only.
2. No code changes — investigation and report only.
3. No premature completion — every gate must be pasted.
4. If any command fails or produces unexpected output, STOP and report it.
