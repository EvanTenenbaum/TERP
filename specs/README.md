# Test Specifications (specs/)

This directory contains Markdown test plans for Playwright AI agents.

## Purpose

Test specifications are human-readable documents that describe:
- What features/workflows to test
- Expected behaviors and outcomes
- Edge cases and error scenarios
- User journeys and interactions

## How AI Agents Use These Files

### Planner Agent
- **Generates** these spec files by exploring the application
- **Output**: Markdown files describing test scenarios

### Generator Agent
- **Reads** these spec files
- **Output**: Executable Playwright tests in `tests-e2e/ai-generated/`

## Directory Structure

```
specs/
├── README.md           # This file
├── core/               # Core business workflow plans
│   ├── orders-workflow.md
│   ├── inventory-management.md
│   └── client-management.md
├── accounting/         # Accounting workflow plans
│   ├── invoices.md
│   ├── bills.md
│   └── payments.md
└── features/           # Feature workflow plans
    ├── dashboard-widgets.md
    ├── calendar.md
    └── todos.md
```

## Spec File Format

Each spec file should follow this format:

```markdown
# Feature Name

## Overview
Brief description of the feature being tested.

## Prerequisites
- User must be logged in
- Test data requirements

## Test Scenarios

### Scenario 1: Happy Path
**Given** initial state
**When** user performs action
**Then** expected outcome

### Scenario 2: Error Handling
**Given** initial state
**When** user performs invalid action
**Then** error message displayed

## Edge Cases
- List of edge cases to test

## Accessibility Requirements
- Keyboard navigation
- Screen reader compatibility
- Color contrast
```

## Creating New Specs

### Manual Creation
1. Create a new `.md` file in the appropriate subdirectory
2. Follow the format above
3. Be specific about expected behaviors

### Using Planner Agent
```bash
# Generate spec for a specific URL
npx playwright ai plan http://localhost:5173/orders

# The Planner will explore and generate a spec file
```

## Best Practices

1. **Be Specific**: Include exact expected values when possible
2. **Cover Edge Cases**: Don't just test happy paths
3. **Include Prerequisites**: Document required test data
4. **Keep Focused**: One feature per spec file
5. **Update Regularly**: Keep specs in sync with feature changes

## Integration with Tests

After creating/updating a spec:

```bash
# Generate tests from spec
npx playwright ai generate specs/core/orders-workflow.md

# Run generated tests
pnpm test:e2e tests-e2e/ai-generated/core/
```

## Version Control

- Commit spec files alongside generated tests
- Review spec changes in PRs
- Keep specs as documentation of expected behavior
