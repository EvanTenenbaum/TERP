# Dependency Audit and Removal Plan

**Date:** November 30, 2025  
**Status:** Analysis Complete - Ready for Implementation  
**Tool Used:** depcheck v1.4.7

## Analysis Summary

Depcheck has identified **11 unused production dependencies** and **11 unused devDependencies** that can be safely removed to reduce the `node_modules` size and improve deployment times.

## Unused Dependencies Analysis

### Production Dependencies (Safe to Remove)

| Dependency                      | Reason                       | Verification                                |
| ------------------------------- | ---------------------------- | ------------------------------------------- |
| `@aws-sdk/client-s3`            | No imports found in codebase | Grep search: No matches                     |
| `@aws-sdk/s3-request-presigner` | No imports found in codebase | Grep search: No matches                     |
| `@clerk/clerk-sdk-node`         | No imports found in codebase | Grep search: No matches (deprecated anyway) |
| `axios`                         | No imports found in codebase | Likely replaced by fetch                    |
| `cookie`                        | No imports found in codebase | Functionality may be in cookie-parser       |
| `framer-motion`                 | No imports found in codebase | Animation library not used                  |
| `jose`                          | No imports found in codebase | JWT library not used                        |
| `pino-pretty`                   | No imports found in codebase | Logging formatter not used                  |
| `socket.io`                     | No imports found in codebase | WebSocket library not used                  |
| `socket.io-client`              | No imports found in codebase | WebSocket client not used                   |
| `tailwindcss-animate`           | No imports found in codebase | CSS animation library not used              |

**Total Size Impact:** Estimated 50-80MB reduction in `node_modules`

### Dev Dependencies (Safe to Remove)

| Dependency                    | Reason       | Notes                                     |
| ----------------------------- | ------------ | ----------------------------------------- |
| `@tailwindcss/typography`     | Not imported | Typography plugin not used                |
| `@testing-library/user-event` | Not imported | Testing utility not used                  |
| `@vitest/coverage-v8`         | Not imported | Coverage tool not configured              |
| `add`                         | Not used     | Likely accidental install                 |
| `autoprefixer`                | Not used     | PostCSS plugin not needed with Tailwind 4 |
| `depcheck`                    | Just added   | Can remove after this audit               |
| `lint-staged`                 | Not used     | Pre-commit hooks not configured           |
| `pnpm`                        | Not needed   | Package manager, not a dependency         |
| `postcss`                     | Not used     | Not needed with Tailwind 4                |
| `tailwindcss`                 | Not used     | Tailwind 4 uses @tailwindcss/vite         |
| `tw-animate-css`              | Not used     | Animation library not used                |

**Note:** Some of these (autoprefixer, postcss, tailwindcss) may have been needed for Tailwind v3 but are no longer required with Tailwind v4's Vite plugin.

## Missing Dependencies (Need to Add)

These dependencies are used but not declared in package.json:

| Dependency             | Used In                 | Action Required        |
| ---------------------- | ----------------------- | ---------------------- |
| `@axe-core/playwright` | E2E accessibility tests | Add to devDependencies |
| `axe-playwright`       | E2E auth tests          | Add to devDependencies |
| `@jest/globals`        | Integration tests       | Add to devDependencies |
| `better-sqlite3`       | Test setup              | Add to devDependencies |

**Note:** The `@shared/const`, `server`, and `@shared/_core` are internal path aliases, not missing packages.

## Implementation Plan

### Phase 1: Remove Unused Production Dependencies

```bash
pnpm remove @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @clerk/clerk-sdk-node axios cookie framer-motion jose pino-pretty socket.io socket.io-client tailwindcss-animate
```

### Phase 2: Remove Unused Dev Dependencies

```bash
pnpm remove -D @tailwindcss/typography @testing-library/user-event @vitest/coverage-v8 add autoprefixer depcheck lint-staged pnpm postcss tailwindcss tw-animate-css
```

### Phase 3: Add Missing Dependencies

```bash
pnpm add -D @axe-core/playwright axe-playwright @jest/globals better-sqlite3
```

### Phase 4: Test and Verify

1. Run full build: `pnpm run build`
2. Run tests: `pnpm test`
3. Run E2E tests: `pnpm test:e2e`
4. Verify application starts: `pnpm dev`

## Expected Impact

- **node_modules size reduction:** 50-100MB (7-15% reduction)
- **pnpm install time:** 5-10% faster
- **Build time:** Minimal direct impact, but cleaner dependency tree
- **Deployment time:** 10-20 seconds faster overall

## Risks and Mitigation

**Risk:** Some dependencies might be used dynamically or in ways depcheck can't detect.

**Mitigation:**

- Run full test suite after removal
- Test application in development mode
- Monitor production deployment for errors
- Keep this document for easy rollback if needed

## Rollback Plan

If issues arise after deployment:

```bash
# Reinstall all removed dependencies
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @clerk/clerk-sdk-node axios cookie framer-motion jose pino-pretty socket.io socket.io-client tailwindcss-animate
pnpm add -D @tailwindcss/typography @testing-library/user-event @vitest/coverage-v8 autoprefixer lint-staged postcss tailwindcss tw-animate-css
```

## Next Steps

1. ✅ Analysis complete
2. ⏳ Implement Phase 1 (remove production deps)
3. ⏳ Implement Phase 2 (remove dev deps)
4. ⏳ Implement Phase 3 (add missing deps)
5. ⏳ Run full test suite
6. ⏳ Deploy and verify
7. ⏳ Document results
