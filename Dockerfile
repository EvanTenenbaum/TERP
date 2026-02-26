# ============================================
# TERP Optimized Multi-Stage Dockerfile
# Version: 2.2 - Prod-only node_modules to reduce disk usage
# ============================================

# ============================================
# Stage 1: Base image with system deps
# ============================================
FROM node:22-slim AS base

LABEL build.version="2026-01-05-MEMORY-FIX"

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential ca-certificates git openssl pkg-config \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# ============================================
# Stage 2: Dependencies (cached layer)
# ============================================
FROM base AS deps

# Copy ONLY dependency files (maximizes cache hits)
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install ALL dependencies (need devDeps for build)
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2b: Production-only dependencies (no devDeps)
# Vite is dynamically imported in server/_core/vite.ts — dev-only path only.
# The production server only needs the packages listed in "dependencies".
# ============================================
FROM deps AS prod-deps

RUN pnpm prune --prod

# ============================================
# Stage 3: Build
# ============================================
FROM deps AS builder

# Copy source code
COPY . .

# VITE build args
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO
ARG VITE_APP_ID
ARG VITE_SENTRY_DSN

ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Create build version file
RUN echo "BUILD_VERSION=v$(date -u +%Y%m%d-%H%M%S)-$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)" > .build-version && cat .build-version

# Build production assets
RUN pnpm run build:production

# ============================================
# Stage 4: Production runtime
# ============================================
FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

# Copy production-only node_modules (no devDeps — saves ~200-400MB disk)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.build-version ./

# Copy drizzle schema (needed for migrations)
COPY --from=builder /app/drizzle ./drizzle

# Copy scripts folder (needed for various runtime operations)
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

# Memory settings optimized for DigitalOcean App Platform
# - basic-xs (512MB): Use 384MB max heap (leaves room for OS + buffers)
# - basic-s (1GB): Use 768MB max heap
# - basic-m (2GB): Use 1536MB max heap
#
# The --expose-gc flag enables manual garbage collection via global.gc()
# which is used by the memory optimizer for emergency cleanup.
#
# NOTE: If upgrading to basic-s or larger, update NODE_MEMORY_LIMIT env var
# in .do/app.yaml and increase --max-old-space-size accordingly.
CMD ["node", "--expose-gc", "--max-old-space-size=1536", "dist/index.js"]
