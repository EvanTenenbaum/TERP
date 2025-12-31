# Dependency Audit Report

**Date:** December 30, 2025  
**Tool:** depcheck v1.4.7

## Summary

| Category | Count | Action Taken |
|----------|-------|--------------|
| Unused Dependencies | 4 | 1 removed, 3 require review |
| Unused devDependencies | 12 | Documented for review |
| Missing Dependencies | 6 | Documented for investigation |

## Actions Taken

### Removed Dependencies

1. **`@slack/bolt`** - Removed
   - Reason: Slackbot code moved to separate repository (EvanTenenbaum/TERP-Slackbot)

## Dependencies Requiring Review

### Potentially Unused (Require Manual Verification)

These dependencies were flagged as unused but may be used indirectly or in ways depcheck cannot detect:

| Dependency | Reason to Keep/Remove |
|------------|----------------------|
| `@anthropic-ai/sdk` | May be used for AI features - verify usage |
| `@google/genai` | May be used for AI features - verify usage |
| `@tiptap/extension-bubble-menu` | May be used in rich text editor - verify usage |

### Unused devDependencies

These are development tools that may still be needed:

| Dependency | Purpose | Recommendation |
|------------|---------|----------------|
| `@testing-library/dom` | Testing utility | Keep if tests use it |
| `@vitest/ui` | Vitest UI | Keep for test debugging |
| `esbuild` | Build tool | May be used by Vite |
| `eslint` | Linting | Keep - essential for code quality |
| `husky` | Git hooks | Keep - enforces pre-commit checks |
| `jsdom` | DOM testing | Keep if tests use it |
| `pino-pretty` | Log formatting | Keep for development |
| `prettier` | Code formatting | Keep - essential for code style |
| `tailwindcss` | CSS framework | Keep - actively used |
| `tsx` | TypeScript execution | Keep - used for scripts |
| `tw-animate-css` | Tailwind animations | Verify usage |
| `typescript` | TypeScript compiler | Keep - essential |

**Recommendation:** Do NOT remove devDependencies without thorough testing, as they may be used in build/test pipelines.

## Missing Dependencies

These dependencies are imported but not listed in package.json:

| Import | File | Analysis |
|--------|------|----------|
| `next` | `./src/pages/vip/live-session/[roomCode].tsx` | False positive - may be alias |
| `next-auth` | `./src/pages/api/sse/live-shopping/[sessionId].ts` | False positive - may be alias |
| `@shared/const` | `./server/routers/auth.ts` | Internal path alias |
| `server` | `./server/_core/imageGeneration.ts` | Internal path alias |
| `@shared/_core` | `./server/_core/simpleAuth.ts` | Internal path alias |
| `@google/generative-ai` | `./scripts/manager.ts` | Should use `@google/genai` instead |

**Note:** Most "missing" dependencies are actually path aliases configured in `tsconfig.json`.

## Recommendations

### Immediate Actions

1. ✅ **Completed:** Remove `@slack/bolt` (Slackbot moved to separate repo)

### Future Actions

1. **Verify AI SDK Usage:** Check if `@anthropic-ai/sdk` and `@google/genai` are actively used
2. **Audit Path Aliases:** Ensure all path aliases in `tsconfig.json` are correctly configured
3. **Run Security Audit:** Execute `npm audit` to address the 7 vulnerabilities identified

## Security Vulnerabilities

The npm uninstall process identified:
- 4 moderate vulnerabilities
- 3 high vulnerabilities

**Recommendation:** Run `npm audit fix` to address these issues.

---

**Next Steps:** Review this report and confirm which additional dependencies should be removed.
