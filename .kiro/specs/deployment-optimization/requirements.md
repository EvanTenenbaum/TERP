# Deployment Optimization Requirements

## Problem Statement

DigitalOcean deployments are slow. Current builds take 5-10 minutes. We want to reduce this significantly.

## Goals

1. Reduce deployment time by 50%+
2. Reduce Docker image size by 200-300MB
3. Enable better build caching
4. Maintain deployment reliability

## Requirements

### REQ-1: Fix Vite Dynamic Import

- **Priority**: P0 (Blocker for other optimizations)
- **Description**: Convert static vite import to dynamic import so production builds don't require vite
- **Acceptance Criteria**:
  - [ ] `server/_core/vite.ts` uses dynamic import for vite
  - [ ] `pnpm install --prod` works without errors
  - [ ] Development mode still works (hot reload, etc.)
  - [ ] Production mode still serves static files correctly

### REQ-2: Multi-Stage Dockerfile

- **Priority**: P1 (Depends on REQ-1)
- **Description**: Create optimized multi-stage Dockerfile with dependency caching
- **Acceptance Criteria**:
  - [ ] Dockerfile uses multi-stage build (deps → build → runner)
  - [ ] Dependencies layer is cached when package.json unchanged
  - [ ] Production image uses `--prod` flag (smaller)
  - [ ] All runtime requirements present (drizzle, scripts, .build-version)
  - [ ] Health endpoints work
  - [ ] Local Docker test passes

### REQ-3: GitHub Actions Build Pipeline

- **Priority**: P2 (Depends on REQ-2)
- **Description**: Build Docker images in GitHub Actions and push to DO Container Registry
- **Acceptance Criteria**:
  - [ ] GitHub Action builds image on push to main
  - [ ] Image pushed to DigitalOcean Container Registry
  - [ ] DO App Platform pulls from registry instead of building
  - [ ] Build caching works across builds
  - [ ] Deployment still auto-triggers on push

## Out of Scope

- Kubernetes migration
- Multi-region deployment
- Blue-green deployments

## Success Metrics

- Build time: < 3 minutes (from ~8 minutes)
- Image size: < 800MB (from ~1.1GB)
- Cache hit rate: > 80% for dependency layer
