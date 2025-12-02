#!/bin/bash

# TERP Beta Readiness - Quick Start Script
# This script sets up your environment and starts the first audit

set -e

echo "🚀 TERP Beta Readiness - Quick Start"
echo "===================================="
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
else
    echo "✅ pnpm already installed"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Verify build works
echo ""
echo "🔨 Verifying build..."
pnpm build

# Run TypeScript check
echo ""
echo "🔍 Checking TypeScript..."
pnpm check

# Run tests
echo ""
echo "🧪 Running tests..."
pnpm test || echo "⚠️  Some tests failed - this is expected, we'll fix them"

# Create audit directories
echo ""
echo "📁 Creating audit directories..."
mkdir -p docs/audits
mkdir -p docs/initiatives

# Check current roadmap status
echo ""
echo "📋 Checking roadmap status..."
pnpm roadmap:validate || echo "⚠️  Roadmap validation issues - we'll address these"

# Check active sessions
echo ""
echo "👥 Checking active sessions..."
cat docs/ACTIVE_SESSIONS.md || echo "No active sessions"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Next Steps:"
echo "1. Review the Beta Readiness Initiative: docs/initiatives/BETA-READINESS-2025.md"
echo "2. Start AUDIT-001: Feature Completeness Audit"
echo "3. Run: pnpm roadmap:validate to check roadmap"
echo ""
echo "🤖 To start AUDIT-001 with Kiro:"
echo "   Tell Kiro: 'Start AUDIT-001 - Feature Completeness Audit'"
echo ""
