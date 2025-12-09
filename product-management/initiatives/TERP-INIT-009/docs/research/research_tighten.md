# Research Source 2: Tighten - 10 Efficient Ways to Seed Your Database

**URL:** https://tighten.com/insights/10-efficient-and-fun-ways-to-seed-your-database/  
**Authority:** Tighten (Laravel development consultancy)  
**Date:** March 10, 2025

## Key Findings

### 10 Seeding Methods Identified

1. **Static hard-coded arrays** - Simple, effective for predefined datasets
2. **Inverse seeder** - Generate seeders FROM existing table data (orangehill/iseed package)
3. **JSON files** - External JSON files for maintainability
4. **Large CSV files** - Database-specific import commands for performance
5. **SQL dumps** - Direct SQL execution for large datasets
6. **External APIs** - Fetch real data from third-party services
7. **Model factories + Faker** - Generate random realistic data
8. **AI-generated data** - Use AI to create contextually realistic data
9. **Interactive seeders** - Prompt user for input during seeding
10. **Environment-based seeding** - Different data per environment

### Critical Performance Insight: `create()` vs `insert()`

**Eloquent's `create()` method:**

- ✅ Fires model events (`creating`, `created`)
- ✅ Triggers observers
- ✅ Auto-fills timestamps
- ✅ Casts attributes
- ❌ **One query per record** (50k records = 50k queries)

**Query Builder's `insert()` method:**

- ✅ **Single query** for entire array (50k records = 1 query)
- ✅ Much faster for large datasets
- ❌ No model events
- ❌ No auto-timestamps
- ❌ No attribute casting

**Recommendation:** Use `insert()` for seeding large datasets

### CSV Import Performance Patterns

**Bad approach:** Read CSV line-by-line in PHP

```php
foreach (file($csv) as $line) {
    Model::create(str_getcsv($line));
}
```

- 50k records = 50k queries
- Very slow

**Good approach:** Use database-native CSV import

- SQLite: `.import --csv file.csv table`
- PostgreSQL: `COPY table FROM 'file.csv' CSV`
- MySQL: `LOAD DATA INFILE 'file.csv' INTO TABLE`
- Result: Single operation, dramatically faster

### Environment-Based Seeding Pattern

```php
public function run(): void
{
    if (app()->environment('production')) {
        // Minimal essential data only
    } elseif (app()->environment('staging')) {
        // Moderate dataset
    } else {
        // Full realistic dataset for development
    }
}
```

### Key Principles

- **Seeders streamline development, testing, and debugging**
- **Well-structured seeders mirror real scenarios**
- **Performance matters** - choose the right method for dataset size
- **Maintainability** - external files (JSON/CSV) are easier to update than hard-coded arrays
- **Realism** - use Faker or AI for realistic test data

### Tools Mentioned

- **Faker** - Generate random realistic data (names, emails, addresses)
- **orangehill/iseed** - Generate seeders from existing table data
- **Database-native import** - Use built-in DB commands for large datasets
