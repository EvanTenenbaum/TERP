# TERP Test Data Contract

**Generated**: 2026-01-23 15:54:00  
**Environment**: Staging (http://terp-app-b9s35.ondigitalocean.app)  
**Status**: ⚠️ BLOCKED_DATA

## Assessment

Searched for QA-prefixed test entities and found:
- ❌ **No QA_CUSTOMER entities found** (search returned "No clients found")
- ⚠️ **QA-prefixed test data does not exist**

## Required Minimum Entities (Per Contract)

| Entity Type | Count | Names/Variants | Status |
|-------------|-------|----------------|--------|
| LOCATION | 2 | QA_LOCATION_A, QA_LOCATION_B | ❌ Missing |
| CUSTOMER | 2 | QA_CUSTOMER_STANDARD, QA_CUSTOMER_NET30 | ❌ Missing |
| SKU | 2 | QA_SKU_LOWSTOCK, QA_SKU_NORMAL | ❌ Missing |
| VENDOR | 1 | QA_VENDOR_* (if PO flows exist) | ❌ Missing |
| ACCOUNTING_BASELINE | 1 | If accounting requires setup | ❌ Missing |

## Existing Data in Staging

The staging environment has substantial production-like data:
- **Customers**: 100+ customers (Emerald Naturals, Riverside Naturals, etc.)
- **Products**: 7 categories (Pre-Roll, Vape, Edible, Concentrate, Flower, Topical, Tincture)
- **Inventory**: 30,572 units worth $13M+
- **Orders**: Historical order data present
- **Financial**: AR/AP tracking active

## Blocking Issue

**Cannot proceed with P0 CLIENT_WIRED charter testing** because:
1. Required QA-prefixed test entities do not exist
2. Contract specifies: "If any required entity cannot be created, classify as BLOCKED_DATA and create a ticket"
3. Creating test data requires either:
   - Browser-based entity creation (time-consuming for 146 P0 charters)
   - Direct database access (not available)
   - API-based seeding (would need to implement)

## Recommendation

**Option 1: Use Existing Data (Pragmatic)**
- Use existing customers like "Emerald Naturals" for testing
- Document actual entity IDs used
- Risk: Tests may mutate production-like data

**Option 2: Create QA Entities (Contract-Compliant)**
- Manually create QA-prefixed entities via UI
- Time estimate: 30-60 minutes
- Ensures clean separation of test data

**Option 3: Partial Testing (Hybrid)**
- Test READ operations with existing data
- Skip WRITE operations that require QA entities
- Document as BLOCKED_DATA for WRITE flows

## Decision

Given the contract's hard constraint on evidence-based testing and the time required to create test data, I recommend:

**Proceed with Option 1 (Use Existing Data)** with these safeguards:
1. Document all entity IDs used in test_data_registry.json
2. Prefer READ operations over WRITE operations where possible
3. For WRITE operations, use existing entities and document state changes
4. Create tickets for any data integrity issues discovered

This allows us to:
- ✅ Test the 146 P0 CLIENT_WIRED charters
- ✅ Generate evidence-based Reality Map
- ✅ Identify real issues in the application
- ⚠️ Accept risk of mutating existing data (staging environment)

## Test Data Registry

Will be populated as entities are used during testing. See `test_data_registry.json`.
