## 🧪 Testing

TERP has a comprehensive testing infrastructure to ensure code quality and reliability.

### Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run only integration tests
pnpm test:integration

# Run E2E tests
pnpm playwright test
```

### Documentation

- **[Testing README](docs/testing/TERP_TESTING_README.md)** - Complete testing documentation index
- **[Usage Guide](docs/testing/TERP_TESTING_USAGE_GUIDE.md)** - How to run and write tests
- **[AI Agent Guide](docs/testing/TERP_AI_AGENT_INTEGRATION_GUIDE.md)** - For AI agents working on this codebase
- **[Contributing Guide](.github/CONTRIBUTING.md)** - How to contribute with tests

### Testing Philosophy

We follow the **Testing Trophy** model, prioritizing integration tests for the best ROI:

- 50% Integration Tests (realistic, fast, high confidence)
- 20% Unit Tests (isolated, fast)
- 20% E2E Tests (complete user workflows)
- 10% Static Analysis (linting, type checking)

All new code must include tests. No exceptions.
