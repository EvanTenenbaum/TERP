# Systematic Code Review with Kiro

**Purpose**: Conduct a comprehensive, line-by-line code review of the entire TERP system using Kiro's capabilities optimally.

**Estimated Time**: 8-12 hours (can be done in phases)

> **Note**: This workflow is optimized for **Kiro IDE**. If you're using a different environment (Claude, ChatGPT, Cursor, etc.), see the "External Agent Alternatives" section at the end of this document.

---

## Why This Approach Works with Kiro

Kiro excels at:
- **Parallel file reading** (`readMultipleFiles`)
- **Pattern searching** (`grepSearch`)
- **File discovery** (`fileSearch`)
- **Diagnostic checking** (`getDiagnostics`)
- **Structured analysis** (AI-powered understanding)

This workflow leverages these strengths for maximum efficiency.

---

## Phase 1: Automated Discovery (30 minutes)

### Step 1.1: Run Automated Analysis

```bash
# Generate component inventory and file analysis
pnpm tsx scripts/comprehensive-code-review.ts
```

This creates:
- `docs/reviews/COMPONENT_INVENTORY.md` - All components cataloged
- `docs/reviews/FILE_ANALYSIS.md` - File-by-file metrics
- `docs/reviews/REVIEW_SUMMARY.md` - Executive summary

### Step 1.2: Review Generated Reports

Read the generated reports to understand:
- System scope and scale
- Component organization
- Initial issues detected
- Areas requiring deep review

---

## Phase 2: Architecture Deep Dive (2-3 hours)

### Step 2.1: Frontend Architecture

**Kiro Commands**:
```
# Read all page files to understand routing
readMultipleFiles([
  "client/src/pages/Dashboard.tsx",
  "client/src/pages/Inventory.tsx",
  "client/src/pages/Orders.tsx",
  // ... all pages
])

# Search for routing patterns
grepSearch("Route", includePattern="client/src/**/*.tsx")

# Find state management patterns
grepSearch("useState|useContext|createContext", includePattern="client/src/**/*.tsx")
```

**Document**:
- Page hierarchy
- Routing structure
- State management approach
- Component composition patterns

### Step 2.2: Backend Architecture

**Kiro Commands**:
```
# Read all routers
readMultipleFiles([
  "server/routers/batches.ts",
  "server/routers/inventory.ts",
  "server/routers/orders.ts",
  // ... all routers
])

# Find tRPC patterns
grepSearch("router\\.|procedure\\.", includePattern="server/routers/**/*.ts")

# Analyze service layer
readMultipleFiles([
  "server/services/batchService.ts",
  "server/services/inventoryService.ts",
  // ... all services
])
```

**Document**:
- API endpoint structure
- Service layer organization
- Business logic location
- Error handling patterns

### Step 2.3: Database Architecture

**Kiro Commands**:
```
# Read schema
readFile("server/db/schema.ts")

# Analyze migrations
grepSearch("CREATE TABLE|ALTER TABLE", includePattern="drizzle/**/*.sql")

# Find query patterns
grepSearch("db\\.query\\.|db\\.select", includePattern="server/**/*.ts")
```

**Document**:
- Table relationships
- Index strategy
- Migration history
- Query patterns

---

## Phase 3: Code Quality Analysis (3-4 hours)

### Step 3.1: TypeScript Quality

**Kiro Commands**:
```
# Find `any` types
grepSearch(": any", includePattern="**/*.ts")

# Find missing return types
grepSearch("function \\w+\\([^)]*\\) \\{", includePattern="**/*.ts")

# Check diagnostics on key files
getDiagnostics([
  "server/routers/orders.ts",
  "client/src/components/OrderForm.tsx",
  // ... critical files
])
```

**Document**:
- Files with `any` types
- Missing type annotations
- TypeScript errors
- Type safety score

### Step 3.2: React Quality

**Kiro Commands**:
```
# Find components without memo
grepSearch("export (function|const) \\w+", includePattern="client/src/components/**/*.tsx")

# Find missing useCallback
grepSearch("onClick=\\{\\(", includePattern="client/src/**/*.tsx")

# Find expensive operations without useMemo
grepSearch("\\.map\\(|\\.filter\\(|\\.sort\\(", includePattern="client/src/**/*.tsx")
```

**Document**:
- Components needing memoization
- Event handlers needing useCallback
- Computations needing useMemo
- Performance optimization opportunities

### Step 3.3: Testing Quality

**Kiro Commands**:
```
# Analyze test coverage
readMultipleFiles([
  "tests/integration/batches.test.ts",
  "tests/integration/orders.test.ts",
  // ... all test files
])

# Find untested files
grepSearch("describe\\(|it\\(|test\\(", includePattern="tests/**/*.ts")

# Compare with source files
fileSearch("*.test.ts")
```

**Document**:
- Test coverage by module
- Missing tests
- Test quality assessment
- Integration vs unit test ratio

---

## Phase 4: Security & Performance (2-3 hours)

### Step 4.1: Security Analysis

**Kiro Commands**:
```
# Find SQL injection risks
grepSearch("sql`.*\\$\\{", includePattern="server/**/*.ts")

# Find XSS risks
grepSearch("dangerouslySetInnerHTML|innerHTML", includePattern="client/**/*.tsx")

# Find authentication checks
grepSearch("protectedProcedure|requireAuth", includePattern="server/**/*.ts")

# Find secrets in code
grepSearch("password|secret|key|token", includePattern="**/*.ts", excludePattern="node_modules/**")
```

**Document**:
- Security vulnerabilities
- Authentication/authorization gaps
- Input validation issues
- Secrets management problems

### Step 4.2: Performance Analysis

**Kiro Commands**:
```
# Find N+1 query patterns
grepSearch("for.*await.*db\\.", includePattern="server/**/*.ts")

# Find large bundle imports
grepSearch("import .* from ['\"](?!\\.|@/)", includePattern="client/**/*.tsx")

# Find expensive operations
grepSearch("\\.map\\(.*\\.map\\(|\\.filter\\(.*\\.filter\\(", includePattern="**/*.ts")
```

**Document**:
- N+1 query issues
- Bundle size concerns
- Expensive operations
- Optimization opportunities

---

## Phase 5: Documentation & Maintainability (1-2 hours)

### Step 5.1: Documentation Audit

**Kiro Commands**:
```
# Find JSDoc comments
grepSearch("/\\*\\*", includePattern="**/*.ts")

# Find README files
fileSearch("README.md")

# Find inline comments
grepSearch("// TODO|// FIXME|// HACK", includePattern="**/*.ts")
```

**Document**:
- Documentation coverage
- TODOs and FIXMEs
- Missing documentation
- Documentation quality

### Step 5.2: Code Organization

**Kiro Commands**:
```
# Analyze file structure
listDirectory("client/src", depth=3)
listDirectory("server", depth=3)

# Find circular dependencies
grepSearch("import.*from.*\\.\\..*\\.\\..*\\.\\.", includePattern="**/*.ts")

# Find large files
# (use FILE_ANALYSIS.md from Phase 1)
```

**Document**:
- Directory structure assessment
- Circular dependencies
- Large files needing refactoring
- Organization improvements

---

## Phase 6: Integration & Infrastructure (1-2 hours)

### Step 6.1: External Integrations

**Kiro Commands**:
```
# Find Clerk usage
grepSearch("@clerk|useUser|useAuth", includePattern="**/*.ts")

# Find Gemini AI usage
grepSearch("gemini|GEMINI_API_KEY", includePattern="**/*.ts")

# Find Slack integration
grepSearch("@slack|slack-bot", includePattern="**/*.ts")

# Find Sentry usage
grepSearch("@sentry|Sentry\\.", includePattern="**/*.ts")
```

**Document**:
- Integration points
- API usage patterns
- Error handling in integrations
- Integration health

### Step 6.2: Infrastructure Review

**Kiro Commands**:
```
# Review deployment config
readMultipleFiles([
  ".do/app.yaml",
  "Dockerfile",
  "nixpacks.toml",
  "vercel.json"
])

# Review CI/CD
readMultipleFiles([
  ".github/workflows/update-dashboard.yml",
  ".github/workflows/mobile-issue-commands.yml"
])

# Review database config
readFile("drizzle.config.ts")
```

**Document**:
- Deployment configuration
- CI/CD pipeline
- Database setup
- Infrastructure as code

---

## Phase 7: Synthesis & Planning (1-2 hours)

### Step 7.1: Consolidate Findings

Create comprehensive report:
- Architecture overview
- Code quality assessment
- Security findings
- Performance issues
- Technical debt inventory

### Step 7.2: Prioritize Issues

Categorize by:
- **P0 (Critical)**: Security vulnerabilities, production bugs
- **P1 (High)**: Performance issues, major technical debt
- **P2 (Medium)**: Code quality, missing tests
- **P3 (Low)**: Documentation, minor refactors

### Step 7.3: Create Improvement Roadmap

Structure improvements into:
- **Quick Wins** (< 1 day): Easy fixes with high impact
- **Short-term** (1-3 days): Important improvements
- **Medium-term** (1-2 weeks): Significant refactors
- **Long-term** (> 2 weeks): Architecture changes

---

## Kiro Best Practices for This Review

### DO ✅

1. **Read multiple related files at once**
   ```
   readMultipleFiles(["file1.ts", "file2.ts", "file3.ts"])
   ```

2. **Use grepSearch for pattern discovery**
   ```
   grepSearch("pattern", includePattern="**/*.ts")
   ```

3. **Check diagnostics after reading code**
   ```
   getDiagnostics(["file.ts"])
   ```

4. **Document findings incrementally**
   - Update review documents after each phase
   - Commit findings regularly

5. **Use fileSearch to locate files**
   ```
   fileSearch("OrderForm")
   ```

### DON'T ❌

1. **Don't read files one by one** - Use `readMultipleFiles`
2. **Don't use bash grep** - Use `grepSearch` tool
3. **Don't read entire large files** - Use line ranges when needed
4. **Don't skip diagnostics** - Always check for errors
5. **Don't try to remember everything** - Document as you go

---

## Output Structure

After completing the review, you'll have:

```
docs/reviews/
├── REVIEW_SUMMARY.md              # Executive summary
├── COMPONENT_INVENTORY.md         # All components cataloged
├── FILE_ANALYSIS.md               # File-by-file metrics
├── ARCHITECTURE_REVIEW.md         # Architecture deep dive
├── CODE_QUALITY_REPORT.md         # Quality assessment
├── SECURITY_AUDIT.md              # Security findings
├── PERFORMANCE_AUDIT.md           # Performance issues
├── TESTING_COVERAGE_REPORT.md     # Test coverage
├── TECHNICAL_DEBT_INVENTORY.md    # Debt catalog
└── IMPROVEMENT_ROADMAP.md         # Prioritized plan
```

---

## Next Steps After Review

1. **Present findings** to team
2. **Prioritize improvements** based on impact
3. **Create tasks** in roadmap
4. **Execute systematically** using agent coordination
5. **Track progress** and measure improvements

---

## Estimated Timeline

| Phase | Time | Can Pause? |
|-------|------|------------|
| 1. Automated Discovery | 30 min | ✅ Yes |
| 2. Architecture Deep Dive | 2-3 hours | ✅ Yes |
| 3. Code Quality Analysis | 3-4 hours | ✅ Yes |
| 4. Security & Performance | 2-3 hours | ✅ Yes |
| 5. Documentation | 1-2 hours | ✅ Yes |
| 6. Integration & Infrastructure | 1-2 hours | ✅ Yes |
| 7. Synthesis & Planning | 1-2 hours | ✅ Yes |
| **Total** | **8-12 hours** | **Highly pausable** |

You can complete this over multiple sessions. Each phase is independent and can be done separately.

---

**Ready to start? Begin with Phase 1!**

```bash
pnpm tsx scripts/comprehensive-code-review.ts
```


---

## External Agent Alternatives

If you're **not** using Kiro IDE (e.g., Claude, ChatGPT, Cursor), use these standard tools instead:

### Tool Mapping

| Kiro Tool | External Alternative | Example |
|-----------|---------------------|---------|
| `readFile` | `cat` | `cat server/routers/orders.ts` |
| `readMultipleFiles` | `cat` (multiple) | `cat file1.ts file2.ts` |
| `grepSearch` | `grep -r` | `grep -r "pattern" src/` |
| `fileSearch` | `find` | `find . -name "*.ts" -path "*/routers/*"` |
| `getDiagnostics` | `pnpm typecheck` | Run after changes |
| `listDirectory` | `ls -la` or `tree` | `ls -la server/routers/` |

### Example Conversions

**Kiro**:
```
readMultipleFiles(["server/routers/orders.ts", "server/routers/batches.ts"])
```

**External**:
```bash
cat server/routers/orders.ts server/routers/batches.ts
```

---

**Kiro**:
```
grepSearch("useState|useContext", includePattern="client/src/**/*.tsx")
```

**External**:
```bash
grep -r --include="*.tsx" "useState\|useContext" client/src/
```

---

**Kiro**:
```
getDiagnostics(["server/routers/orders.ts"])
```

**External**:
```bash
pnpm typecheck
# Or for specific file issues:
npx tsc --noEmit server/routers/orders.ts
```

### External Agent Workflow

1. **Read steering files first**: `cat .kiro/steering/*.md`
2. **Register your session**: See `.kiro/steering/05-external-agent-handoff.md`
3. **Use bash commands** for all file operations
4. **Run `pnpm typecheck`** after any code changes
5. **Archive session** when complete

For complete external agent instructions, see:
- `.kiro/steering/05-external-agent-handoff.md`
- `EXTERNAL_AGENT_README.md`
