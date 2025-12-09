# Research Source 4: Microsoft EF Core - Data Seeding Best Practices

**URL:** https://learn.microsoft.com/en-us/ef/core/modeling/data-seeding  
**Authority:** Microsoft (official Entity Framework Core documentation)  
**Date:** January 15, 2025

## Key Findings

### Official Recommendation: UseSeeding and UseAsyncSeeding

> "Using `UseSeeding` and `UseAsyncSeeding` is the recommended way of seeding the database with initial data when working with EF Core."

**Key characteristics:**

- Introduced in EF Core 9 (2024)
- Called as part of `EnsureCreated`, `Migrate`, and `dotnet ef database update`
- Protected by **migration locking mechanism** to prevent concurrency issues
- One clear location for all seeding code
- Runs even if no model changes or migrations applied

### Four Seeding Approaches Identified

1. **Configuration options (UseSeeding/UseAsyncSeeding)** - RECOMMENDED
2. **Custom initialization logic** - Manual control
3. **Model managed data (HasData)** - For static reference data only
4. **Manual migration customization** - Advanced scenarios

### Critical Distinction: "Model Managed Data" vs "Data Seeding"

Microsoft **renamed** `HasData` from "data seeding" to "model managed data" because:

- The naming "set incorrect expectations"
- `HasData` has significant limitations
- Only appropriate for specific types of data

**Model managed data (HasData) is NOT for general seeding**

### When NOT to Use HasData (Model Managed Data)

HasData should be avoided when data:

- Is temporary (for testing)
- Depends on database state
- Is large (captured in migration snapshots → huge files, degraded performance)
- Needs database-generated key values
- Requires custom transformation (e.g., password hashing)
- Requires external API calls (e.g., ASP.NET Core Identity)
- Isn't fixed and deterministic (e.g., `DateTime.Now`)

**For these scenarios, use UseSeeding/UseAsyncSeeding instead**

### HasData Limitations

Because migrations generate update scripts without connecting to the database:

- Primary key values must be specified manually
- Previously inserted data removed if primary key changes
- Only useful for **static data** that doesn't change outside migrations
- Example: ZIP codes, country codes, fixed reference tables

### Concurrency Protection

The **migration locking mechanism** prevents:

- Multiple processes seeding simultaneously
- Race conditions during deployment
- Data corruption from concurrent initialization

This is critical for production deployments where multiple instances might start simultaneously.

### EnsureCreated vs Migrate

**EnsureCreated:**

- Creates database if it doesn't exist
- Runs UseSeeding/UseAsyncSeeding
- Does NOT update schema if database exists
- Does NOT update managed data if database exists
- Suitable for: test databases, in-memory provider, non-relational databases

**Migrate:**

- Applies pending migrations
- Runs UseSeeding/UseAsyncSeeding
- Updates schema to match model
- Should be used for production with relational databases

**Important:** Don't call `EnsureCreated` if you plan to use migrations

### Key Principles

1. **Separation of concerns** - Seeding is separate from schema migrations
2. **Concurrency safety** - Use locking mechanisms
3. **Idempotency** - Seeding should be safe to run multiple times
4. **Environment awareness** - Different data for different environments
5. **Performance** - Large seed data should not be in migration snapshots

### Comparison to TERP's Current Approach

**TERP's old approach (problematic):**

- Seeding embedded in app startup (server/\_core/index.ts)
- No concurrency protection
- Mixed with auto-migration logic
- Caused crashes when schema drifted

**Microsoft's recommended approach:**

- Seeding separate from app startup
- Protected by locking mechanism
- Called as part of migration process
- Safe to run multiple times
