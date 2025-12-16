FROM node:20-slim AS base

# Force rebuild: 2025-12-08-RAILWAY-FIX-DATABASE-URL
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

# VITE environment variables for build-time embedding
# Note: These are public/publishable values embedded in client bundle, not secrets
# DigitalOcean passes these as build args when scope: RUN_AND_BUILD_TIME is set
# Kaniko (DO's build system) requires explicit ARG declarations
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO
ARG VITE_APP_ID
ARG VITE_SENTRY_DSN

# Debug: Print ARG values to verify they're being passed
RUN echo "DEBUG: VITE_APP_TITLE=${VITE_APP_TITLE}" && \
    echo "DEBUG: VITE_APP_LOGO=${VITE_APP_LOGO}" && \
    echo "DEBUG: VITE_APP_ID=${VITE_APP_ID}" && \
    echo "DEBUG: VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}"

# Make args available as env vars for the build process
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Create build timestamp file to bust cache and verify deployed version
# This RUN command always produces a different output, forcing Docker to rebuild subsequent layers
RUN echo "BUILD_VERSION=v$(date -u +%Y%m%d-%H%M%S)-$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)" > /app/.build-version && \
    cat /app/.build-version

# Build production assets with VITE variables embedded
# Explicitly set env vars in the same RUN command to ensure they're available to Node.js
RUN export VITE_CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY}" && \
    export VITE_APP_TITLE="${VITE_APP_TITLE}" && \
    export VITE_APP_LOGO="${VITE_APP_LOGO}" && \
    export VITE_APP_ID="${VITE_APP_ID}" && \
    export VITE_SENTRY_DSN="${VITE_SENTRY_DSN}" && \
    echo "Building with VITE_APP_TITLE=${VITE_APP_TITLE}" && \
    pnpm run build:production

# Expose default port
EXPOSE 3000

# Start server directly (no automatic migrations)
# Run one-time setup manually: bash /app/scripts/one-time-setup.sh
CMD ["pnpm", "run", "start:production"]

