# Contributing to TERP

Thank you for your interest in contributing to TERP! This document provides guidelines for contributing code, documentation, and other improvements.

---

## 🚨 For AI Agents: READ CLAUDE.md FIRST

> **BEFORE following this guide or doing ANY work:**
>
> **ALL AI agents MUST first read `/CLAUDE.md`** in the repository root.
>
> CLAUDE.md is the **single source of truth** for all agent protocols. It contains the consolidated, authoritative instructions for working on TERP. This contributing guide supplements CLAUDE.md but does NOT override it.
>
> **If there are ANY conflicts between CLAUDE.md and this document, CLAUDE.md takes precedence.**

---

## 🚀 Getting Started

1. **Fork the repository** and clone it locally
2. **Install dependencies**: `pnpm install`
3. **Read the testing documentation**: See `docs/testing/TERP_TESTING_README.md`

---

## ✅ Before You Commit

All contributions must follow our testing best practices. Before committing any code:

1. **Write tests first** (Test-Driven Development)
   - For new features: Write tests that describe the desired behavior
   - For bug fixes: Write tests that reproduce the bug

2. **Run all checks locally**:

   ```bash
   pnpm test        # Run all tests
   pnpm lint        # Check code quality
   pnpm typecheck   # Verify type safety
   pnpm format      # Format code
   ```

3. **Ensure tests pass**: All tests must pass before you can commit

4. **Follow commit conventions**: Use [Conventional Commits](https://www.conventionalcommits.org/)
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `test:` for test-only changes
   - `refactor:` for code refactoring

---

## 🤖 For AI Agents

If you are an AI agent working on this codebase, you **must**:

1. **Read `/CLAUDE.md` FIRST** - This is the master protocol document
2. Follow the [AI Agent Integration Guide](docs/testing/TERP_AI_AGENT_INTEGRATION_GUIDE.md)

**Key requirements**:

- **Read CLAUDE.md before doing ANY work**
- All new code must include tests
- Follow the TDD workflow (Red → Green → Refactor)
- Run the pre-commit checklist before every commit
- Never bypass quality checks
- Follow verification protocols in CLAUDE.md Section 2

---

## 📝 Pull Request Process

1. **Create a feature branch**: `git checkout -b feat/my-new-feature`
2. **Make your changes** with accompanying tests
3. **Push to your fork**: `git push origin feat/my-new-feature`
4. **Open a Pull Request** with a clear description of your changes
5. **Wait for CI checks** to pass (automated tests, linting, etc.)
6. **Address review feedback** if requested

---

## 🧪 Testing Philosophy

We follow the **Testing Trophy** model:

- **50% Integration Tests**: Test how multiple units work together
- **20% Unit Tests**: Test individual functions in isolation
- **20% E2E Tests**: Test complete user workflows
- **10% Static Analysis**: Catch errors before runtime

See `docs/testing/TERP_TESTING_BEST_PRACTICES.md` for detailed guidance.

---

## 🐛 Reporting Issues

If you find a bug or have a feature request:

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with a clear description
3. **Include reproduction steps** if reporting a bug
4. **Add relevant labels** (bug, enhancement, documentation, etc.)

---

## 📚 Documentation

All major features should include:

- **Code comments** for complex logic
- **JSDoc comments** for public APIs
- **README updates** if adding new functionality
- **Testing documentation** if introducing new test patterns

---

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

---

## 📞 Questions?

If you have questions about contributing, reach out to the team or open a discussion on GitHub.

**Thank you for helping make TERP better!** 🎉
