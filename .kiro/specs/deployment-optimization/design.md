# Deployment Optimization Design

## Overview

Three-phase optimization to reduce deployment time and image size.

## Phase 1: Fix Vite Dynamic Import ✅ IMPLEMENTED

### Current State (FIXED)

```typescript
// server/_core/vite.ts - NOW uses dynamic imports
export async function setupVite(app: Express, server: Server) {
  // Dynamic imports - only loaded when this function is called (dev mode only)
  const { createServer: createViteServer } = await import("vite");
  const viteConfigModule = await import("../../vite.config.js");
  const viteConfig = viteConfigModule.default;
  // ...
}
```

### Why This Works

- `setupVite()` is only called when `NODE_ENV === "development"`
- In production, the dynamic import never executes
- This allows `pnpm install --prod` to exclude vite and devDependencies
- The `.js` extension is used because esbuild outputs JS, not TS

### Technical Note: vite.config Import

The import uses `.js` extension (`../../vite.config.js`) because:

1. In development: tsx/node runs the TS file directly
2. In production bundle: esbuild compiles vite.config.ts to JS
3. The dynamic import resolves correctly in both cases

### Files Changed

- `server/_core/vite.ts` - Converted to dynamic imports ✅

---

## Phase 2: Multi-Stage Dockerfile

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: BASE                                                │
│ - node:20-slim                                               │
│ - System deps (python3, build-essential, openssl, git)       │
│ - pnpm setup                                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: DEPS (cached layer)                                 │
│ - FROM base                                                  │
│ - COPY package.json, pnpm-lock.yaml, patches/                │
│ - pnpm install (ALL deps for build)                          │
│ - This layer is CACHED unless deps change                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: BUILDER                                             │
│ - FROM deps                                                  │
│ - COPY source code                                           │
│ - Build frontend (vite) and backend (esbuild)                │
│ - Generate .build-version                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 4: RUNNER (production)                                 │
│ - FROM base                                                  │
│ - pnpm install --prod (ONLY production deps)                 │
│ - COPY dist/, drizzle/, scripts/, .build-version             │
│ - ~200-300MB smaller than full install                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Optimizations

1. **Dependency caching**: DEPS stage only rebuilds when package.json changes
2. **Production-only deps**: RUNNER uses `--prod` flag
3. **Minimal final image**: Only runtime artifacts copied

### Files Changed

- `Dockerfile` - Replace with multi-stage version

---

## Phase 3: GitHub Actions Build Pipeline

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Push to main  │────▶│  GitHub Action  │────▶│  DO Container   │
│                 │     │  builds image   │     │    Registry     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  DO App Platform│
                                               │  pulls & deploys│
                                               └─────────────────┘
```

### Why GitHub Actions?

1. **Faster runners**: GitHub runners are faster than DO's build system
2. **Better caching**: Docker layer cache persists across builds
3. **Parallel builds**: Can build while other CI runs
4. **More control**: Custom build logic, notifications, etc.

### Workflow Steps

1. On push to `main`:
   - Checkout code
   - Set up Docker Buildx (for caching)
   - Login to DO Container Registry
   - Build image with cache
   - Push to registry
   - Trigger DO App Platform deployment

### DO App Platform Changes

- Change from `dockerfile_path` to `image` source
- Point to DO Container Registry image
- Remove build configuration (builds happen in GHA)

### Files Changed

- `.github/workflows/build-and-deploy.yml` - New workflow
- `.do/app.yaml` - Change to image-based deployment

### Prerequisites

- DO Container Registry created
- DO API token with registry access
- GitHub secrets configured:
  - `DIGITALOCEAN_ACCESS_TOKEN`
  - `REGISTRY_NAME` (e.g., `registry.digitalocean.com/terp`)

---

## Risk Mitigation

### Phase 1 Risks

| Risk              | Mitigation                  |
| ----------------- | --------------------------- |
| Dev mode breaks   | Test locally before deploy  |
| TypeScript errors | Check with `pnpm typecheck` |

### Phase 2 Risks

| Risk                 | Mitigation                    |
| -------------------- | ----------------------------- |
| Missing runtime deps | Test container locally        |
| Build fails          | Keep old Dockerfile as backup |
| Cache not working    | Verify with `docker history`  |

### Phase 3 Risks

| Risk                     | Mitigation                  |
| ------------------------ | --------------------------- |
| Registry auth fails      | Test manually first         |
| Deployment not triggered | Add manual trigger option   |
| Rollback needed          | Keep ability to build in DO |

---

## Rollback Plan

### Phase 1

```bash
git revert <commit-hash>  # Revert vite.ts changes
```

### Phase 2

```bash
git checkout HEAD~1 -- Dockerfile  # Restore old Dockerfile
```

### Phase 3

```yaml
# .do/app.yaml - Revert to dockerfile build
services:
  - name: web
    dockerfile_path: Dockerfile # Instead of image
```
