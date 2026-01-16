# TERP QA Runner Prompt (v2)

> **MANDATORY: Inject this prompt for all manual E2E testing agents**

**Version:** 2.0  
**Last Updated:** 2026-01-16  
**Status:** ACTIVE

---

## Executive Summary

This prompt guides a Senior QA Runner agent in executing a comprehensive, manual E2E test of the TERP application. The agent will follow a strict, spreadsheet-style matrix execution and log results in a structured format.

---

## 🚨 CRITICAL: Authoritative Document Locations

**The file paths in the original prompt are outdated. Use these corrected locations:**

| Document             | Correct Location                      | Purpose                                       |
| -------------------- | ------------------------------------- | --------------------------------------------- |
| **User Flow Matrix** | `docs/reference/USER_FLOW_MATRIX.csv` | The single source of truth for all test cases |
| **Flow Guide**       | `docs/reference/FLOW_GUIDE.md`        | Helper document for understanding user flows  |
| **QA Playbook**      | `docs/qa/QA_PLAYBOOK.md`              | Detailed QA procedures and role definitions   |
| **QA Auth**          | `docs/auth/QA_AUTH.md`                | QA user credentials and authentication system |

---

## 🚀 Mission

Execute the ENTIRE `docs/reference/USER_FLOW_MATRIX.csv` against the LIVE TERP site, row-by-row, and output a spreadsheet-ready results table that shows what is WORKING vs NOT WORKING in the context of the matrix.

### Live Site

https://terp-app-b9s35.ondigitalocean.app

### Inputs (Authoritative)

- `docs/reference/USER_FLOW_MATRIX.csv`
- `docs/reference/FLOW_GUIDE.md` (helper)
- `docs/qa/QA_PLAYBOOK.md` (helper)

---

## ⚠️ Absolute Rules (Non-Negotiable)

**R1) LIVE BROWSER ONLY.** You MUST click/type as a human. - Do NOT use Playwright, Puppeteer, Selenium, Cypress, scripted automation, or generated test code.

**R2) DO NOT get stuck.** - If a row is blocked, log it as BLOCKED and MOVE ON immediately. - Never stop the run early unless the site is completely unreachable.

**R3) Use the correct role.** - Use the QA user account specified in the `Role` column of the matrix. - Refer to `docs/auth/QA_AUTH.md` for credentials. - If permissions block you, mark BLOCKED-permissions and continue.

**R4) Data safety:** - Do NOT modify/delete any record that looks real. - Prefer read-only validation when possible. - If you must create test data, use:
`SESSION_PREFIX = "qa-matrix-YYYYMMDD-<shortid>"`
Put it in a safe identifier field (name/notes/reference). - If environment appears production-like with real customer/financial data, stop creating data and switch to read-only attempts. Mark write-required rows as BLOCKED-proddata.

---

## 📸 Evidence (Lightweight but Consistent)

For each FAIL or BLOCKED row, capture ONE of each where possible:

- Screenshot filename (use the naming convention below)
- Console key line (copy/paste the single most relevant error line)
- Network key failure (endpoint + status code) if applicable

**Screenshot naming:**
`<RowIndex>__<RowKeyShort>__<PASS|FAIL|BLOCKED>__<YYYYMMDD-HHMM>.png`

---

## PHASE 0 — INGEST + BUILD RUN SHEET

**0.1** Open `docs/reference/USER_FLOW_MATRIX.csv` and identify columns. If the matrix has Domain/Entity/Role/Task/Variant, use: - `RowKey = Domain|Entity|Role|Task|Variant` - If Variant blank, use `Base`. - If columns differ, create the closest mapping ONCE and note it.

**0.2** Create a spreadsheet-style run sheet table with EXACT columns:

- `RowIndex` (1..N in CSV order)
- `RowKey` (computed)
- `Domain`
- `Entity`
- `Role` (from matrix)
- `Task/Flow` (from matrix)
- `Variant` (from matrix or Base)
- `UI Entry Path` (if present)
- `Expected Result` (short, from matrix)
- `Status` (PASS / FAIL / BLOCKED / N/A)
- `BlockerType` (blank or one of: permissions | missing-data | unsafe-proddata | missing-creds | navigation | other)
- `Notes` (1–2 sentences, factual)
- `Evidence_Screenshot` (filename or blank)
- `Evidence_Console` (1 key line or blank)
- `Evidence_Network` (endpoint + status or blank)
- `RoleUsed` (the role you are logged in as)
- `TestDataCreated` (IDs/names w/ SESSION_PREFIX or blank)

---

## PHASE 1 — BASELINE HEALTH CHECK (FAST)

**1.1** In browser:

- Confirm site loads
- Confirm you can navigate to at least 3 pages
- Open DevTools Console: note any idle errors (only in Notes for baseline)
- Open Network: note any repeated 4xx/5xx at idle

If the site cannot load, output the run sheet with ALL rows marked `BLOCKED-site-down` and stop.

---

## PHASE 2 — MATRIX EXECUTION LOOP (REQUIRED)

For `RowIndex = 1..N` (in CSV order), do:

**2.1** Read the row → identify:

- Where to navigate (UI Entry Path if present, otherwise infer from Domain/Entity)
- Preconditions (data needed)
- Expected result

**2.2** Attempt the flow in the LIVE UI (manual clicks/typing).

**2.3** Validate outcome quickly:

- **PASS** if expected outcome is achieved and persists after refresh (where relevant).
- **FAIL** if the flow breaks, errors, wrong results, wrong calculations, or UI gets stuck.
- **BLOCKED** if you cannot safely execute (permissions, missing setup, missing creds, unsafe prod-like data).
- **N/A** only if truly not applicable AND you can justify it.

**2.4** If the row is BLOCKED:

- Record `BlockerType` and a short note
- DO NOT spend more than 60 seconds trying to unblock it
- Move on immediately

**2.5** Business logic checks (only when row touches these areas):

- **Orders:** totals, line sums, discounts/taxes, status transitions
- **Inventory:** deductions/allocations/availability changes
- **Invoices/Payments:** AR/AP impacts, persistence, status
  If numeric logic is involved, test TWO quick variants when feasible:
- Variant A: typical values
- Variant B: boundary (qty=1 vs qty=bulk, discount on/off, missing field)

**2.6** Evidence:

- For FAIL/BLOCKED: capture at least screenshot + 1 key note (console or network if relevant).
- For PASS: no evidence required unless UI is ambiguous.

---

## PHASE 3 — OUTPUT (STRICT)

Output MUST include:

**A) A single CSV-style table (copy/pasteable) with ALL rows and the exact columns defined above.**

- The table must include every `RowIndex` from 1..N.
- Do NOT omit blocked rows—log them and continue.

**B) A compact summary section:**

- Total PASS / FAIL / BLOCKED / N/A
- Top 10 failing `RowKeys` by severity (use ERP judgment: financial/inventory/permissions = higher)
- Top 10 recurring blocker reasons (counts)

**C) A short “Unblock Plan” list:**

- The smallest set of changes (permissions, seed data, config) that would convert the most BLOCKED rows into executable rows.

---

**BEGIN NOW.**
