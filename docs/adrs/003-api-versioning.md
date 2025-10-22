# ADR-003: API Versioning Strategy

**Date**: 2025-10-22  
**Status**: Accepted  
**Deciders**: Evan Tenenbaum  

## Context

As the TERP ERP system evolves, API contracts will change. To prevent breaking existing clients (including the frontend), we need a versioning strategy that allows:

- Non-breaking changes to be added safely
- Breaking changes to be introduced without disrupting production
- Gradual migration from old to new API versions
- Clear deprecation timeline for old endpoints

## Decision

We will adopt **URL-based API versioning** with the following structure:

### Version Namespace

- **Current baseline**: `/api/v1/*`
- **Future versions**: `/api/v2/*`, `/api/v3/*`, etc.

### Versioning Rules

1. **Additive changes** (non-breaking):
   - Add new optional fields to request/response
   - Add new endpoints
   - These changes stay in the current version (e.g., `v1`)

2. **Breaking changes**:
   - Remove or rename fields
   - Change field types
   - Change endpoint behavior
   - These changes require a new version (e.g., `v2`)

### Contract Validation

All API contracts are defined in `@terp/types` using **Zod schemas**:

```typescript
export const CreateQuoteRequestSchema = z.object({
  customerId: UuidSchema,
  lineItems: z.array(QuoteLineItemSchema).min(1),
  notes: z.string().optional(),
});
```

CI runs **contract tests** to detect breaking changes:
- Compare current schemas with baseline
- Fail CI if breaking change detected without `BREAKING_CHANGE_APPROVED=true` label

### Deprecation Policy

When introducing a breaking change:

1. Create new version endpoint (e.g., `/api/v2/quotes`)
2. Add deprecation header to old endpoint:
   ```
   Deprecation: true
   Sunset: 2025-12-31T23:59:59Z
   Link: <https://docs.terp.com/api/v2/quotes>; rel="successor-version"
   ```
3. Document in `DEPRECATION.md`:
   - Endpoint being deprecated
   - Removal date
   - Migration path to new version
4. Maintain old endpoint until sunset date
5. Remove old endpoint and code after sunset

### Compatibility Shims

During migration periods, use **adapters** to support both versions:

```typescript
// v1 endpoint (deprecated)
export async function POST_v1(request: Request) {
  const data = await request.json();
  const v2Data = adaptV1ToV2(data); // Transform to v2 format
  return POST_v2(new Request(request.url, { body: JSON.stringify(v2Data) }));
}
```

## Consequences

### Positive
- **No breaking changes**: Existing clients continue to work during migrations
- **Clear migration path**: Deprecation headers and docs guide users to new versions
- **Contract safety**: Zod schemas + CI tests prevent accidental breaking changes
- **Gradual migration**: Old and new versions coexist during transition

### Negative
- **Code duplication**: Multiple versions of endpoints must be maintained
- **Testing overhead**: Both old and new versions must be tested
- **Deprecation tracking**: Must actively monitor and remove old endpoints

### Neutral
- **Version in URL**: Explicit version in path (vs header) for clarity
- **Semantic versioning**: Major version only (v1, v2) not full semver (v1.2.3)

## Alternatives Considered

1. **Header-based versioning**: Rejected due to lack of visibility and caching issues
2. **No versioning**: Rejected due to inability to make breaking changes safely
3. **GraphQL**: Rejected due to complexity and learning curve

## References

- [API Versioning Best Practices](https://www.troyhunt.com/your-api-versioning-is-wrong-which-is/)
- [RFC 8594: Sunset Header](https://datatracker.ietf.org/doc/html/rfc8594)
- [Zod Documentation](https://zod.dev/)

