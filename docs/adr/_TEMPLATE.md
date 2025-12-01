# ADR-NNNN: [Title]

**Status:** Proposed | Accepted | Deprecated | Superseded by [ADR-XXXX](./XXXX-title.md)
**Date:** YYYY-MM-DD
**Author:** [Agent-X / Session-ID / Developer Name]
**Deciders:** [Who approved this decision]

## Context

[Describe the issue motivating this decision. What problem are we solving? What constraints exist?]

Example:
> We need to store product quantities in the database. The application performs calculations on these quantities for pricing, inventory management, and reporting.

## Decision

[Describe the decision and why it was chosen. Be specific about what will be done.]

Example:
> We will store all quantity fields as `decimal(15, 4)` type in MySQL rather than VARCHAR strings or integers.

## Consequences

### Positive

- [List benefits of this decision]
- [Another benefit]

### Negative

- [List drawbacks or tradeoffs]
- [Another drawback]

### Neutral

- [List neutral impacts or things that don't change]

## Alternatives Considered

### Alternative 1: [Name]

[Description of alternative approach]

**Rejected because:** [Why this wasn't chosen]

### Alternative 2: [Name]

[Description of alternative approach]

**Rejected because:** [Why this wasn't chosen]

## Implementation Notes

[Any specific guidance for implementing this decision]

```typescript
// Example code showing the pattern
```

## Related Decisions

- [ADR-XXXX](./XXXX-title.md) - Related decision
- [Link to external docs if relevant]

## References

- [Link to relevant documentation]
- [Link to discussion or issue]
