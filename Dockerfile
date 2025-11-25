FROM node:20-slim AS base

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

# Add build timestamp to bust cache and ensure fresh builds
ARG BUILD_TIMESTAMP
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP:-$(date -u +%Y%m%d-%H%M%S)}

# Copy application source
COPY . .

# Build production assets
RUN pnpm run build:production

# Expose default port
EXPOSE 3000

# Start the production server
CMD ["pnpm", "run", "start:production"]

