# FEAT-013: Packaged Unit Type Implementation

## Status: ✅ COMPLETE

## Overview
FEAT-013 adds comprehensive support for packaged unit types in addition to weight-based, count-based, and volume-based units. This enables products to be managed in various package configurations (e.g., "Pack of 10", "Case of 24", "Pallet").

## Implementation Summary

### Database Schema
The unit types system was implemented in migration `0047_feat_009_015_implementation.sql` and enhanced with additional packaged units in `0056_add_additional_packaged_units.sql`.

**Table: `unit_types`**
```sql
CREATE TABLE `unit_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `category` ENUM('WEIGHT', 'COUNT', 'VOLUME', 'PACKAGED') NOT NULL,
  `conversion_factor` DECIMAL(15, 6) DEFAULT 1.000000,
  `base_unit_code` VARCHAR(20),
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Features:**
- **Category-based organization**: Units are categorized as WEIGHT, COUNT, VOLUME, or PACKAGED
- **Conversion system**: Each unit has a `conversion_factor` and optional `base_unit_code` for conversions
- **Flexible packaging**: PACKAGED units can represent any container type (boxes, cases, pallets, etc.)
- **Soft deletion**: Uses `is_active` flag to deactivate units without breaking existing data

### Default Unit Types Seeded

#### COUNT Units
- **EA** (Each) - Individual unit count

#### WEIGHT Units
- **G** (Gram) - Base weight unit
- **OZ** (Ounce) - 28.3495g conversion
- **LB** (Pound) - 453.592g conversion
- **KG** (Kilogram) - 1000g conversion

#### VOLUME Units
- **ML** (Milliliter) - Base volume unit
- **L** (Liter) - 1000ml conversion

#### PACKAGED Units
- **PKG** (Package) - Generic pre-packaged unit
- **PK5** (Pack of 5) - 5-unit package (converts to EA)
- **PK10** (Pack of 10) - 10-unit package (converts to EA)
- **BOX** (Box) - Box container
- **CASE** (Case) - Generic case container
- **CASE24** (Case of 24) - 24-unit case (converts to EA)
- **PALLET** (Pallet) - Standard pallet (quantity varies by product)

### Backend Implementation

#### Schema Definition
**File:** `/home/user/TERP/drizzle/schema.ts` (lines 6610-6642)

```typescript
export const unitTypeCategoryEnum = mysqlEnum("unitTypeCategory", [
  "WEIGHT",
  "COUNT",
  "VOLUME",
  "PACKAGED",
]);

export const unitTypes = mysqlTable("unit_types", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: unitTypeCategoryEnum.notNull(),
  conversionFactor: decimal("conversion_factor", { precision: 15, scale: 6 }).default("1"),
  baseUnitCode: varchar("base_unit_code", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UnitType = typeof unitTypes.$inferSelect;
export type InsertUnitType = typeof unitTypes.$inferInsert;
```

#### API Router
**File:** `/home/user/TERP/server/routers/organizationSettings.ts` (lines 248-351)

**Available Endpoints:**
- `organizationSettings.unitTypes.list` - List all active unit types
- `organizationSettings.unitTypes.getByCode` - Get specific unit by code
- `organizationSettings.unitTypes.create` - Create new unit type (admin only)
- `organizationSettings.unitTypes.update` - Update unit type (admin only)
- `organizationSettings.unitTypes.delete` - Deactivate unit type (admin only)

**Example Usage:**
```typescript
// List all unit types
const units = await trpc.organizationSettings.unitTypes.list.useQuery();

// Create a new packaged unit
await trpc.organizationSettings.unitTypes.create.mutate({
  code: "PK12",
  name: "Pack of 12",
  category: "PACKAGED",
  description: "12-unit package",
  conversionFactor: 12,
  baseUnitCode: "EA"
});
```

#### Seed Function
**File:** `/home/user/TERP/server/services/seedDefaults.ts` (lines 516-580)

New function `seedDefaultUnitTypes()` added to ensure unit types are seeded in development environments. This is called as part of `seedAllDefaults()`.

### Frontend Implementation

#### UI Component
**File:** `/home/user/TERP/client/src/components/settings/OrganizationSettings.tsx` (lines 348-608)

**Features:**
- **Add new unit types**: Form with code, name, category, and description fields
- **Category selector**: Dropdown with all four unit categories (COUNT, WEIGHT, VOLUME, PACKAGED)
- **Visual categorization**: Color-coded badges for each category
  - WEIGHT: Blue
  - COUNT: Green
  - VOLUME: Purple
  - PACKAGED: Orange
- **Inline editing**: Edit unit type details directly in the list
- **Soft deletion**: Deactivate units without affecting existing products

### Product Integration

#### Products Table
**File:** `/home/user/TERP/drizzle/schema.ts` (line 422)

Products have a `uomSellable` field (Unit of Measure - Sellable):
```typescript
uomSellable: varchar("uomSellable", { length: 20 }).notNull().default("EA")
```

This field stores the unit type code and defaults to "EA" (Each).

### Conversion System

The conversion system allows different unit types to be related through conversion factors:

**Example Conversions:**
- 1 OZ = 28.3495 G (base unit)
- 1 LB = 453.592 G (base unit)
- 1 PK5 = 5 EA (base unit)
- 1 PK10 = 10 EA (base unit)
- 1 CASE24 = 24 EA (base unit)

**Conversion Logic:**
```typescript
conversionFactor: decimal("conversion_factor", { precision: 15, scale: 6 })
baseUnitCode: varchar("base_unit_code", { length: 20 })
```

When a unit has a `baseUnitCode`, the `conversionFactor` represents how many base units equal one of this unit.

### Inventory Calculations

The unit type system is designed to support inventory calculations:

1. **Direct quantity tracking**: Products can be tracked in their natural unit (e.g., cases, pallets)
2. **Base unit conversion**: Quantities can be converted to base units (EA, G, ML) for standardized calculations
3. **Flexible display**: UI can show quantities in the most appropriate unit

**Note:** Current implementation focuses on unit type management. Future enhancements may include:
- Automatic unit conversion in inventory operations
- Multi-unit display (e.g., "2 cases + 5 units")
- Unit-specific pricing rules

## Files Modified

### New Files
1. `/home/user/TERP/drizzle/migrations/0056_add_additional_packaged_units.sql` - Migration adding PK5, PK10, CASE24, PALLET

### Modified Files
1. `/home/user/TERP/server/services/seedDefaults.ts` - Added `seedDefaultUnitTypes()` function and integrated into `seedAllDefaults()`

### Existing Files (Already Implemented)
1. `/home/user/TERP/drizzle/schema.ts` - Unit types schema definition
2. `/home/user/TERP/drizzle/0047_feat_009_015_implementation.sql` - Initial unit types table and base units
3. `/home/user/TERP/server/routers/organizationSettings.ts` - Unit types API router
4. `/home/user/TERP/client/src/components/settings/OrganizationSettings.tsx` - Unit types management UI

## Testing

### Manual Testing Checklist
- [x] Can create packaged units via UI
- [x] Can edit packaged units
- [x] Can deactivate packaged units
- [x] Unit categories are properly displayed with color coding
- [x] Conversion factors are stored correctly
- [x] Base unit relationships are maintained

### Database Verification
```sql
-- Verify all default units are seeded
SELECT code, name, category, conversion_factor, base_unit_code
FROM unit_types
WHERE is_active = 1
ORDER BY sort_order;

-- Check packaged units specifically
SELECT code, name, description, conversion_factor, base_unit_code
FROM unit_types
WHERE category = 'PACKAGED' AND is_active = 1;
```

### Expected Results
Should return all 14 default unit types including:
- 7 PACKAGED units (PKG, PK5, BOX, PK10, CASE, CASE24, PALLET)
- 5 WEIGHT units (G, OZ, LB, KG)
- 2 VOLUME units (ML, L)
- 1 COUNT unit (EA)

## Future Enhancements

1. **Automatic Conversion UI**: Display product quantities in multiple units simultaneously
2. **Unit Validation**: Ensure products use valid, active unit types
3. **Conversion Calculator**: Helper function to convert between related units
4. **Unit History**: Track changes to unit type configurations
5. **Batch Operations**: Convert inventory from one unit to another in bulk
6. **Advanced Packaging**: Support nested units (e.g., "pallets containing cases containing units")

## Migration Path

### For New Installations
Run migrations in order:
1. Migration 0047 creates the unit_types table and seeds base units
2. Migration 0056 adds additional packaged units
3. `seedAllDefaults()` ensures unit types are seeded in development

### For Existing Installations
Existing data is not affected. Products will continue using their current `uomSellable` values. To leverage new packaged units:

1. Run migration 0056 to add new packaged unit types
2. Update product `uomSellable` values as needed via UI or direct SQL
3. No downtime required - changes are additive only

## Related Documentation

- Organization Settings: `/home/user/TERP/client/src/components/settings/OrganizationSettings.tsx`
- Product Schema: `/home/user/TERP/drizzle/schema.ts`
- Migration 0047 (FEAT-009 through FEAT-015): `/home/user/TERP/drizzle/0047_feat_009_015_implementation.sql`

## Conclusion

FEAT-013 is fully implemented and ready for use. The system supports:
- ✅ Creating packaged units (e.g., "10-pack", "Case")
- ✅ Units supporting quantity-based vs weight-based categories
- ✅ Conversion factors for unit relationships
- ✅ Full CRUD operations via UI and API
- ✅ Seeding of comprehensive default units

The inventory calculation system has the infrastructure in place to use these units, though advanced conversion features may be added in future iterations.
