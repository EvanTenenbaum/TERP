# Research Source 3: Liquibase Forum - Production Database Seeding Best Practices

**URL:** https://forum.liquibase.org/t/best-practices-for-seeding-a-production-database/9494  
**Authority:** Liquibase Community (database schema management tool)  
**Date:** June 2024

## Key Findings

### Problem Statement

Developers want to seed data when creating new tables in production. Questions:

- What are best practices?
- How does rollback work with seeded data?
- Is there a better way than loadData?

### Recommended Approach: loadData with Explicit Rollback

```xml
<changeSet id="1" author="liquibaseuser">
    <loadData file="names.csv" tableName="testTable"/>
    <rollback>
        <dropTable tableName="testTable"/> // or custom rollback logic
    </rollback>
</changeSet>
```

### Critical Issue: Rollback Breaks Without Explicit Rollback Strategy

**Real-world problem reported:**

- Team used `loadData` without defining rollback
- Liquibase couldn't automatically rollback seeded data
- **Rollback functionality completely broken** - couldn't rollback past the seed changeset
- Blocked all future rollbacks in the changelog

### Key Lessons

1. **Always define explicit rollback for seed data**
   - Seeding is NOT automatically reversible
   - Must specify what to do on rollback (delete data, drop table, etc.)

2. **Empty rollback is an option**
   - If you don't want to rollback seed data, define empty rollback
   - Prevents blocking future rollbacks

3. **Seeding in production requires careful planning**
   - Can't just "add seed data" without considering rollback scenarios
   - Breaking rollback functionality affects entire deployment pipeline

4. **loadData is the right tool, but requires configuration**
   - Recommended by Liquibase team
   - Must be used with explicit rollback strategy

### Implications for TERP

- **Seeding embedded in app startup = no rollback strategy**
- **Schema migrations + seeding in same process = dangerous**
- **Need separation of concerns:**
  - Schema changes (migrations) - reversible
  - Data seeding (separate) - with explicit rollback or marked as non-reversible

### Best Practice Pattern

**DO:**

- Separate schema migrations from data seeding
- Define explicit rollback for all seed operations
- Test rollback scenarios before production
- Document what happens on rollback

**DON'T:**

- Seed data during app startup
- Mix schema changes with data seeding
- Assume seeding is automatically reversible
- Block rollback functionality by omitting rollback strategy
