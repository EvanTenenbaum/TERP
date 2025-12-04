FROM node:20-slim AS base

# Force rebuild: 2025-12-02-BUG-002-FIX
LABEL build.version="2025-12-02-BUG-002-FIX" \
      build.description="Fix frontend build failure - add missing VITE env vars"

# Install corepack/pnpm and system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential ca-certificates git openssl pkg-config \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy dependency manifests first for better caching
COPY package.json pnpm-lock.yaml* ./
COPY patches ./patches

# Install dependencies (prefer frozen lockfile, fall back to update)
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Copy application source
COPY . .

# Create build timestamp file to bust cache and verify deployed version
# This RUN command always produces a different output, forcing Docker to rebuild subsequent layers
RUN echo "BUILD_VERSION=v$(date -u +%Y%m%d-%H%M%S)-$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)" > /app/.build-version && \
    cat /app/.build-version

# Build production assets
RUN pnpm run build:production

# Expose default port
EXPOSE 3000

# Start the production server
CMD ["pnpm", "run", "start:production"]

