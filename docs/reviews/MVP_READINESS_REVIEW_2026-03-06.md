# TERP MVP Readiness Review: Multi-Agent Structured Debate

**Date:** 2026-03-06
**Methodology:** 8-agent parallel review (4 Advocate + 4 Adversarial) with moderated debate
**Moderator:** Claude Opus 4.6

---

## Review Methodology

Two independent teams reviewed the entire TERP codebase simultaneously:

**Advocate Team** (4 agents arguing FOR readiness):
1. Architecture & Code Quality Reviewer
2. Feature Completeness Reviewer
3. Security & Authentication Reviewer
4. Database & Data Integrity Reviewer

**Adversarial Team** (4 agents arguing AGAINST readiness):
1. Security Red Team
2. UX & Feature Gaps Hunter
3. Production Readiness Challenger
4. Technical Debt Auditor

Each agent performed a thorough independent exploration of the codebase from their specialized perspective. Their findings were then brought into a structured 5-round debate with rulings on each point of contention.

---

## Team Scores Summary

### Advocate Team Scores

| Reviewer | Score | Assessment |
|----------|-------|------------|
| Architecture | 4.2/5 | Production-ready with tactical issues |
| Feature Completeness | 62/100 | Solid foundation, critical bugs |
| Security | 4.2/5 | Conditionally ready |
| Data Integrity | 3.8/5 | Qualified with caveats |

### Adversarial Team Verdicts

| Reviewer | Verdict | Key Finding |
|----------|---------|-------------|
| Security Red Team | DO NOT SHIP | No multi-tenancy, unscoped queries, hard deletes |
| Production Readiness | DO NOT SHIP | In-memory locks with autoscaling, no backups |
| Technical Debt | DO NOT SHIP | 51 vendor refs, 86 `:any` files, 440+ TODOs |

---

## Detailed Debate Proceedings

### ROUND 1: Is the Core Platform Architecturally Sound?

**Advocate Position:**
The architecture scores 4.2/5. The stack is modern and cohesive: React 19, TypeScript 5.9.3 in strict mode, tRPC 11, Drizzle 0.44, Zod 4, Tailwind 4 — no version conflicts. The codebase is substantial: 173 routers, 71 services, 531 components, 60+ pages. Build tooling is healthy with pnpm check/lint/test/build configured and Husky pre-commit hooks. Consistent tRPC procedure patterns with Zod validation and permission middleware throughout.

**Adversary Position:**
34 legacy `*Db.ts` files contain 5,907+ LOC in the top 3 alone, and services actively import from them. 86 files contain `: any` type annotations. 440+ TODO/FIXME comments indicate incomplete work. 187 `console.log` statements remain in production code. The deprecated vendors table still has 51 active references.

**RULING: ADVOCATE PREVAILS (with caveats)**

The architecture is sound for an MVP. The stack choices are excellent, patterns are consistent, and build tooling works. Legacy `*Db.ts` files and `: any` annotations are containment problems, not structural failures. However, incomplete migration from legacy patterns increases maintenance risk.

**Debate Score: 3.8/5 — Viable for MVP, not for scale.**

---

### ROUND 2: Are the Critical Business Flows Functional?

**Advocate Position:**
- Client Management: **4/5** — Complete CRUD, party model working, Client 360 dashboard
- Financial Management: **4/5** — Chart of Accounts, GL, invoicing, payments, AR/AP, COGS
- Auth/RBAC: **5/5** — JWT auth, 7 roles, permission middleware, demo mode
- 4 of 8 golden flows pass (GF-004 Invoice & Payment, GF-006 Client Ledger, GF-007 Inventory Mgmt, +1)

**Adversary Position:**
- Orders: **2/5** — 3 golden flows BLOCKED by backend bugs (BUG-130 strainId schema drift)
- Compliance: **0/5** — No COA, manifest, or license tracking for cannabis wholesale
- 4 of 8 golden flows BLOCKED (GF-001 Direct Intake, GF-002 Procure-to-Pay, GF-003 Order-to-Cash, GF-005 Pick & Pack)
- Accounting integration incomplete — ordersDb.ts has 3 TODOs for invoice/payment creation
- BUG-001, BUG-130, BUG-137 block order creation and fulfillment

**RULING: ADVERSARY PREVAILS**

A wholesale cannabis ERP that cannot reliably complete an order-to-invoice flow is not functional for its stated purpose. The blocked golden flows represent the core order lifecycle. Furthermore, 0/5 on compliance is disqualifying for a cannabis-specific ERP. While financial infrastructure exists, it is disconnected from the order pipeline.

**Debate Score: 2.5/5 — Core revenue-generating flows are broken.**

---

### ROUND 3: Is the Security Posture Adequate for Customer Data?

**Advocate Position:**
- JWT auth with httpOnly cookies, bcrypt hashing — **5/5**
- RBAC with permission middleware — **5/5**
- Zero violations of `ctx.user?.id || 1` pattern — **5/5** (getAuthenticatedUserId used correctly)
- Zod validation on all procedures, DOMPurify sanitization middleware — **5/5**
- 100% Drizzle ORM parameterized queries, zero SQL injection risk — **5/5**

**Adversary Position:**
- **CRITICAL: No multi-tenancy/org scoping** — users table has no companyId; any user can query any client's data
- **CRITICAL: Unscoped financial queries** — calendarFinancials.ts returns data for ANY client
- **CRITICAL: 15+ hard deletes** across 6+ files violating soft-delete mandate
- **HIGH: Input-driven actor attribution** in ordersDb.ts and inventoryIntakeService.ts
- **MEDIUM: No CSRF tokens, Cookie SameSite inconsistency**

**RULING: ADVERSARY PREVAILS**

The perimeter security is genuinely well-built (auth, input validation, SQL injection prevention). But authorization within the perimeter is missing. Authentication answers "who are you?" — authorization answers "what can you see?" The absence of organization/tenant scoping means authenticated users can access other organizations' data. Hard deletes break audit trails. Multi-tenancy gap alone is a showstopper.

**Debate Score: 2.5/5 — Strong perimeter, critical authorization gaps.**

---

### ROUND 4: Is the System Operationally Ready for Production?

**Advocate Position:**
Multi-stage Docker builds, DigitalOcean App Platform deployment, 48 clean Drizzle migrations, CI/CD with automatic staging deploys, 158 tables with 262 foreign keys and 324 indexes.

**Adversary Position:**
- **CRITICAL: In-memory inventory locks + autoscaling** — inventoryLocking.ts warns about this. DigitalOcean autoscales 2-4 instances with no Redis, no sticky sessions. Concurrent inventory operations WILL corrupt data.
- **CRITICAL: No automated backups** — backup-database.ts exists but BACKUP_S3_BUCKET not configured
- **CRITICAL: Sentry disabled by default** — SENTRY_DSN blank, zero error tracking
- **MEDIUM-HIGH: Cron leader election is filesystem-based** — doesn't work multi-instance
- **MEDIUM: Logs go to stdout only** — no aggregation, no alerting

**RULING: ADVERSARY PREVAILS DECISIVELY**

The in-memory locking issue is a guaranteed data corruption vector in multi-instance deployment. When DigitalOcean scales to 2+ instances, concurrent inventory operations can both acquire "locks" on their respective instances and modify the same data. Zero automated backups means no recovery path. Zero error tracking means failures go undetected until customers report them.

**Debate Score: 1.5/5 — Deployment exists, operational readiness does not.**

---

## Final Scoreboard

| Round | Topic | Winner | Score |
|-------|-------|--------|-------|
| 1 | Architecture | Advocate (with caveats) | 3.8/5 |
| 2 | Business Flows | Adversary | 2.5/5 |
| 3 | Security | Adversary | 2.5/5 |
| 4 | Operations | Adversary | 1.5/5 |
| **Weighted Average** | | | **2.6/5** |

---

## FINAL VERDICT: DO NOT SHIP

TERP is not ready for customer-facing production deployment. However, the gap is closable. The architecture is sound, the security perimeter is strong, and substantial feature work is complete. The failures are concentrated in specific, identifiable areas.

This is a **"not yet"** verdict, not a **"start over"** verdict.

---

## Path to Ship: Blockers in Priority Order

### P0 — Must Fix Before ANY Customer Deployment (Est. 2-3 weeks)

| # | Blocker | Why | Effort |
|---|---------|-----|--------|
| 1 | **Replace in-memory inventory locks with Redis/distributed locks** | Guaranteed data corruption on multi-instance. Single most dangerous defect. | 3-5 days |
| 2 | **Fix the 4 blocked golden flows (GF-001, GF-002, GF-003, GF-005)** | Core order lifecycle does not work. Software has no value proposition without this. | 3-5 days |
| 3 | **Add organization/tenant scoping to data queries** | Any authenticated user can see all data. Must fix before adding a second user. | 3-5 days |
| 4 | **Configure automated database backups** | Zero recovery path from any failure. Non-negotiable for financial data. | 1 day |
| 5 | **Enable Sentry error tracking** | Cannot detect or diagnose production failures without it. | 0.5 days |

### P1 — Must Fix Before Multi-Customer Deployment (Est. 2-3 weeks additional)

| # | Blocker | Why | Effort |
|---|---------|-----|--------|
| 6 | **Complete order-to-invoice integration** | Orders exist but don't create financial records. Revenue cannot be tracked. | 3-5 days |
| 7 | **Fix hard deletes (15+ instances)** | Audit trail gaps in financial/inventory data. Replace with soft deletes. | 2-3 days |
| 8 | **Fix input-driven actor attribution** | ordersDb.ts and inventoryIntakeService.ts accept userId from input. | 1-2 days |
| 9 | **Fix cron job leader election for multi-instance** | Filesystem-based leader election fails with multiple containers. | 2-3 days |
| 10 | **Add CSRF protection and fix cookie SameSite** | Session security gap for cross-origin scenarios. | 1-2 days |

### P2 — Required for Cannabis Industry Viability (Est. 4-6 weeks)

| # | Blocker | Why | Effort |
|---|---------|-----|--------|
| 11 | **Implement COA (Certificate of Analysis) management** | Cannabis wholesale regulatory requirement. | 2-3 weeks |
| 12 | **Implement manifest generation** | Required for legal transport of cannabis products. | 1-2 weeks |
| 13 | **Implement license tracking** | Buyers and sellers must have valid licenses. | 1 week |

---

## Recommended Path Forward

TERP is approximately **60-70% of the way to a shippable MVP**. The remaining work is well-defined and bounded.

1. **Weeks 1-3:** Fix P0 blockers. Re-run all 8 golden flows. Verify inventory locking under concurrent load. Deploy to staging with 2+ instances and validate.
2. **Weeks 4-6:** Fix P1 blockers. Begin single-tenant pilot with Evan's operation (no external customers).
3. **Weeks 7-12:** Build P2 compliance features. Only then consider external customer onboarding.

The architecture does not need to be rewritten. The security primitives do not need to be replaced. The work is additive and corrective, not foundational.

---

## What's Working Well (Credit to the Team)

The adversarial process surfaced real issues, but it's important to acknowledge what's genuinely strong:

- **Modern, well-chosen tech stack** with no version conflicts
- **173 routers with consistent patterns** — serious engineering effort
- **RBAC system with 7 roles** and granular permissions
- **Zero SQL injection risk** — 100% ORM parameterized queries
- **DOMPurify sanitization middleware** on all protected procedures
- **Zero violations of forbidden auth patterns** (ctx.user?.id || 1)
- **158 tables with 262 foreign keys** — comprehensive data model
- **Multi-stage Docker builds** with aggressive layer caching
- **Pre-commit hooks** enforcing code quality

This is a system built by people who care about quality. The gaps are execution timing issues, not competence issues.

---

*Review generated by 8-agent parallel review with structured adversarial debate. All findings are evidence-based with specific file citations.*
