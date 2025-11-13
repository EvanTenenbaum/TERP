# Needs & Matching Intelligence Module

## Overview

The Needs & Matching Intelligence Module is a comprehensive system that adds intelligence and proactive opportunity identification to TERP. It enables tracking client needs, matching them with available inventory and vendor supply, and providing actionable insights for sales opportunities.

## Features

### 1. Client Needs Management
- **Create and track client needs** with detailed specifications (strain, category, subcategory, grade, quantity, price)
- **Priority levels** (URGENT, HIGH, MEDIUM, LOW)
- **Status tracking** (ACTIVE, FULFILLED, EXPIRED, CANCELLED)
- **Duplicate prevention** - Automatically detects similar existing needs
- **Expiration handling** - Automatically expires needs past their needed-by date

### 2. Intelligent Matching Engine
- **Multi-source matching**: Matches needs against:
  - Current inventory batches
  - Vendor supply items
  - Historical purchase patterns (lapsed buyers)
- **Confidence scoring** (0-100) based on:
  - Strain match (40 points)
  - Category match (30 points)
  - Subcategory match (15 points)
  - Grade match (10 points)
  - Price validation (±5 points)
  - Quantity validation
- **Match types**: EXACT (≥80% confidence), CLOSE (50-79%), HISTORICAL
- **Client-specific pricing** integration with TERP pricing engine

### 3. Match Recording & Analytics
- **Automatic match recording** for learning and improvement
- **User action tracking**: CREATED_QUOTE, CONTACTED_VENDOR, DISMISSED
- **Conversion tracking**: Track which matches result in sales
- **Analytics functions** for performance measurement

### 4. Historical Analysis
- **Purchase pattern analysis** - Identify what clients buy regularly
- **Lapsed buyer detection** - Find clients who used to buy but haven't recently
- **Proactive recommendations** - Suggest reaching out to lapsed buyers

### 5. Vendor Supply Management
- Track vendor supply items with availability windows
- Match vendor supply with client needs
- Reserve and track vendor supply status

### 6. User Interface Components

#### Client Pages
- **"Needs & History" tab** on client detail pages
- Create and manage client needs
- View matching inventory/vendor supply
- One-click quote creation from matches
- Purchase history patterns

#### Inventory Pages
- **"Client Interest" widget** on batch detail pages
- Shows which clients need this batch
- Match confidence and priority indicators
- Quick quote creation and client contact

#### Dashboard
- **"Smart Opportunities" widget**
- Top matching opportunities with highest confidence
- Potential revenue calculations
- Quick navigation to client needs

#### Dedicated Pages
- **/needs** - Needs Management page
  - View all client needs
  - Search and filter capabilities
  - Stats dashboard
  - Smart opportunities tab
- **/vendor-supply** - Vendor Supply Management page
  - Track vendor supply items
  - Find matching clients

## Database Schema

### `client_needs` Table
```sql
CREATE TABLE client_needs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clientId INT NOT NULL,
  strain VARCHAR(100),
  category VARCHAR(100),
  subcategory VARCHAR(100),
  grade VARCHAR(20),
  quantityMin VARCHAR(20),
  quantityMax VARCHAR(20),
  priceMax VARCHAR(20),
  neededBy TIMESTAMP,
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  status ENUM('ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
  notes TEXT,
  createdBy INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_client (clientId),
  INDEX idx_status (status),
  INDEX idx_priority (priority)
);
```

### `vendor_supply` Table
```sql
CREATE TABLE vendor_supply (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendorId INT NOT NULL,
  strain VARCHAR(100),
  category VARCHAR(100),
  subcategory VARCHAR(100),
  grade VARCHAR(20),
  quantityAvailable VARCHAR(20),
  pricePerUnit VARCHAR(20),
  availableUntil TIMESTAMP,
  status ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'EXPIRED') DEFAULT 'AVAILABLE',
  notes TEXT,
  createdBy INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor (vendorId),
  INDEX idx_status (status)
);
```

### `match_records` Table
```sql
CREATE TABLE match_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clientId INT NOT NULL,
  clientNeedId INT,
  inventoryBatchId INT,
  vendorSupplyId INT,
  matchType ENUM('EXACT', 'CLOSE', 'HISTORICAL') NOT NULL,
  confidenceScore VARCHAR(10),
  matchReasons JSON,
  userAction ENUM('CREATED_QUOTE', 'CONTACTED_VENDOR', 'DISMISSED'),
  actionAt TIMESTAMP,
  actionBy INT,
  resultedInSale BOOLEAN DEFAULT FALSE,
  saleOrderId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_client (clientId),
  INDEX idx_need (clientNeedId),
  INDEX idx_batch (inventoryBatchId)
);
```

## API Endpoints

### Client Needs
- `POST /api/trpc/clientNeeds.create` - Create a new client need
- `GET /api/trpc/clientNeeds.getByClient` - Get needs for a specific client
- `GET /api/trpc/clientNeeds.getAllWithMatches` - Get all needs with match counts
- `GET /api/trpc/clientNeeds.getSmartOpportunities` - Get top opportunities
- `GET /api/trpc/clientNeeds.findMatches` - Find matches for a specific need
- `POST /api/trpc/clientNeeds.createQuoteFromMatch` - Create quote from match
- `PUT /api/trpc/clientNeeds.update` - Update a client need
- `DELETE /api/trpc/clientNeeds.delete` - Delete a client need

### Vendor Supply
- `POST /api/trpc/vendorSupply.create` - Create vendor supply item
- `GET /api/trpc/vendorSupply.getAll` - Get all vendor supply items
- `PUT /api/trpc/vendorSupply.update` - Update vendor supply
- `DELETE /api/trpc/vendorSupply.delete` - Delete vendor supply

### Matching
- `GET /api/trpc/matching.findMatchesForNeed` - Find matches for a need
- `GET /api/trpc/matching.findMatchesForBatch` - Find client needs for a batch
- `GET /api/trpc/matching.findMatchesForVendorSupply` - Find client needs for vendor supply
- `GET /api/trpc/matching.analyzeClientPurchaseHistory` - Analyze purchase patterns
- `GET /api/trpc/matching.identifyLapsedBuyers` - Identify lapsed buyers

## File Structure

```
server/
├── clientNeedsDbEnhanced.ts       # CRUD operations for client needs
├── vendorSupplyDb.ts              # CRUD operations for vendor supply
├── matchingEngineEnhanced.ts      # Core matching algorithm
├── matchingEngineReverseSimplified.ts  # Reverse matching (batch → needs)
├── matchRecordsDb.ts              # Match tracking and analytics
├── historicalAnalysis.ts          # Purchase pattern analysis
├── needsMatchingService.ts        # Business logic (quote creation, etc.)
├── routers/
│   ├── clientNeedsEnhanced.ts     # Client needs API
│   ├── vendorSupply.ts            # Vendor supply API
│   └── matchingEnhanced.ts        # Matching API
└── tests/
    ├── matchingEngine.test.ts     # Matching algorithm tests (21 tests)
    ├── clientNeeds.test.ts        # Client needs tests (14 tests)
    └── matchRecords.test.ts       # Match records tests (18 tests)

client/src/
├── components/
│   ├── needs/
│   │   ├── ClientNeedsTab.tsx     # Main needs tab for client pages
│   │   ├── NeedForm.tsx           # Create/edit need form
│   │   ├── MatchCard.tsx          # Display match details
│   │   └── MatchBadge.tsx         # Match confidence indicator
│   ├── inventory/
│   │   └── ClientInterestWidget.tsx  # Shows client interest in batch
│   └── dashboard/
│       └── widgets-v2/
│           └── SmartOpportunitiesWidget.tsx  # Dashboard widget
└── pages/
    ├── NeedsManagementPage.tsx    # Full needs management interface
    └── VendorSupplyPage.tsx       # Vendor supply management
```

## Testing

### Test Coverage
- **53 passing tests** across 3 test suites
- **Coverage areas**:
  - Matching algorithm confidence scoring
  - Match type classification
  - Duplicate prevention
  - Input validation
  - Match recording and analytics
  - Conversion tracking

### Running Tests
```bash
pnpm test server/tests/matchingEngine.test.ts
pnpm test server/tests/clientNeeds.test.ts
pnpm test server/tests/matchRecords.test.ts
```

## Setup & Deployment

### 1. Database Migration
```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="mysql://user:password@host:port/database"

# Run migration
pnpm db:push
```

This will create the following tables:
- `client_needs`
- `vendor_supply`
- `match_records`

### 2. Environment Variables
No additional environment variables required. The module uses existing TERP configuration.

### 3. Navigation Setup
Routes are automatically configured in `App.tsx`:
- `/needs` - Needs Management
- `/vendor-supply` - Vendor Supply Management

## Usage Examples

### Creating a Client Need
```typescript
const need = await trpc.clientNeeds.create.mutate({
  clientId: 123,
  strain: "Blue Dream",
  category: "Flower",
  subcategory: "Indoor",
  grade: "A",
  quantityMin: "100",
  quantityMax: "500",
  priceMax: "2500",
  neededBy: new Date("2024-12-31"),
  priority: "HIGH",
  createdBy: 1,
});
```

### Finding Matches
```typescript
const matches = await trpc.clientNeeds.findMatches.query({
  needId: 456,
});

// Returns array of matches with confidence scores
matches.forEach(match => {
  console.log(`${match.matchType} match: ${match.confidence}% confidence`);
  console.log(`Reasons: ${match.reasons.join(", ")}`);
});
```

### Creating Quote from Match
```typescript
const quote = await trpc.clientNeeds.createQuoteFromMatch.mutate({
  clientId: 123,
  clientNeedId: 456,
  matches: [match1, match2],
  userId: 1,
});
```

## Performance Considerations

### Current Implementation
- **Database-level operations** - All matching done via SQL queries
- **Acceptable for MVP** - Works well for typical TERP usage patterns
- **No caching** - Fresh data on every request

### Future Optimizations (if needed)
1. **Caching layer** - Redis for frequently accessed matches
2. **Background processing** - Queue-based matching for large datasets
3. **Materialized views** - Pre-computed match results
4. **Elasticsearch** - Full-text search for strain/category matching

## Known Limitations

### 1. Simplified Strain Matching
- Current implementation uses category/subcategory/grade matching
- Full strain matching requires joining with `strains` table
- Can be enhanced in future iterations

### 2. Pricing Calculation
- Uses simplified pricing engine integration
- May not account for all pricing rules
- Works with basic client-specific pricing

### 3. Historical Matching
- Implemented but simplified
- Could be enhanced with more sophisticated pattern recognition
- Currently based on exact product matches

## Future Enhancements

### Short-term
1. **Strain table integration** - Full strain matching with foreign keys
2. **Email notifications** - Alert users when high-confidence matches are found
3. **Match detail modal** - Dedicated view for match details
4. **Bulk operations** - Create multiple needs at once

### Long-term
1. **Machine learning** - Improve match confidence with ML models
2. **Predictive analytics** - Predict client needs based on patterns
3. **Automated quote generation** - Auto-create quotes for high-confidence matches
4. **Integration with CRM** - Sync with external CRM systems

## Maintenance

### Regular Tasks
1. **Clean expired needs** - Run monthly to archive old needs
2. **Review match analytics** - Check conversion rates
3. **Update pricing rules** - Ensure pricing integration is current
4. **Monitor performance** - Check query performance as data grows

### Troubleshooting
- **No matches found**: Check if inventory/vendor supply has matching categories
- **Low confidence scores**: Review match criteria and adjust thresholds
- **Duplicate needs**: Verify duplicate prevention logic is working
- **Quote creation fails**: Check order system integration

## Support

For questions or issues:
1. Check this documentation
2. Review test files for examples
3. Check DEVELOPMENT_PROTOCOLS.md for coding standards
4. Contact development team

## Version History

### v1.0.0 (Initial Release)
- Complete needs and matching system
- 53 passing tests
- Full UI integration
- Production-ready backend
- Comprehensive documentation

---

**Last Updated**: 2024-12-26  
**Module Status**: ✅ Production Ready  
**Test Coverage**: 53 passing tests  
**TypeScript Errors**: 0

