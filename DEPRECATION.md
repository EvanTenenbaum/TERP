# API Deprecation Log

This document tracks deprecated APIs, features, and their removal timelines.

## Active Deprecations

*No active deprecations at this time.*

---

## Deprecation Policy

When an API endpoint or feature is deprecated:

1. **Announcement**: Deprecation is announced with at least 90 days notice
2. **Headers**: Deprecated endpoints return `Deprecation: true` and `Sunset` headers
3. **Documentation**: Migration path is documented in this file
4. **Sunset Date**: After the sunset date, the endpoint/feature is removed
5. **Breaking Change**: Removal is considered a breaking change and requires major version bump

### Deprecation Header Format

```http
Deprecation: true
Sunset: Wed, 31 Dec 2025 23:59:59 GMT
Link: <https://docs.terp.com/api/v2/endpoint>; rel="successor-version"
```

---

## Removed Deprecations

*No removed deprecations yet.*

---

## How to Deprecate an Endpoint

1. Add entry to "Active Deprecations" section above
2. Update endpoint to return deprecation headers
3. Create successor endpoint (if applicable)
4. Notify users via release notes
5. After sunset date, remove endpoint and move entry to "Removed Deprecations"

### Template

```markdown
### [Endpoint/Feature Name]

- **Deprecated On**: YYYY-MM-DD
- **Sunset Date**: YYYY-MM-DD (90+ days from deprecation)
- **Reason**: Brief explanation
- **Migration Path**: Link to new endpoint or alternative
- **Breaking Change**: Yes/No
```

---

## Contact

For questions about deprecations, please open a GitHub issue.

