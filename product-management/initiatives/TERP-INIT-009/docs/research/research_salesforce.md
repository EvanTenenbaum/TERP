# Research Source 1: Salesforce - Data Seeding Best Practices

**URL:** https://www.salesforce.com/platform/data-seeding/  
**Authority:** Salesforce (enterprise CRM platform leader)

## Key Findings

### Best Practices

1. **Plan for relevance** - Seed minimum viable dataset that reflects real user behavior
2. **Prioritize data integrity** - Validate fields, types, relationships; eliminate duplicates
3. **Version your seed data** - Treat data seeds like code, store in version control
4. **Automate where possible** - Use CI pipelines, scripts for anything beyond one-time use

### Common Use Cases

- Feature testing (validate logic for new features)
- User acceptance testing (UAT)
- Configuration validation (test in sandbox before production)

### Methods

1. **ORM-based seeding** - Use models to define and load seed data (Entity Framework, Rails)
2. **Code-driven seeding** - SQL scripts or REST APIs for full control
3. **Template-based seeding** - CSV/JSON files for repeatable imports
4. **Asynchronous seeding** - Batch jobs for large volumes without blocking

### Challenges Identified

- **Data consistency** - Missing or broken relationships derail testing
- **Sensitive data** - Risk of exposing PII in non-production (GDPR/CCPA compliance)
- **Performance at scale** - Large datasets can cause slowdowns if not planned

### Privacy & Compliance

- Always mask or anonymize PII in test environments
- Use data masking tools (Salesforce Data Mask & Seed)
- Document seeding processes for compliance (GDPR, CCPA)

### Environment-Specific Approaches

- **Developer sandboxes** - Start empty, need manual/automated seeding
- **Partial copy sandboxes** - Include sample data, may need additional seeding
- **Full sandboxes** - Mirror production, still need seeding for new features

### Key Principle

> "Good data seeding is intentional — not incidental"
> "Manual uploads work once. For anything more, use CI pipelines, scripts, or DevOps tools"
