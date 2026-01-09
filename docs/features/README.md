# TERP Feature Documentation

**Last Updated:** January 9, 2026

This directory contains comprehensive documentation for all TERP features, including discovered modules, user flows, and gap analysis.

## Directory Structure

```
docs/features/
├── README.md                           # This file
├── DISCOVERED_FEATURES.md              # Catalog of all discovered features
├── USER_FLOWS.md                       # Complete user flow mappings
├── GAP_ANALYSIS.md                     # Feature completeness analysis
├── FEATURE_ROADMAP.md                  # Unified feature roadmap
└── modules/                            # Individual feature documentation
    ├── calendar-system.md
    ├── task-management.md
    ├── advanced-accounting.md
    ├── client-needs-crm.md
    ├── matchmaking-service.md
    ├── pricing-profiles.md
    ├── vip-portal.md
    ├── product-intake.md
    ├── credit-management.md
    ├── sample-management.md
    ├── multi-location-tracking.md
    ├── notes-commenting.md
    ├── inbox-notifications.md
    ├── dashboard-system.md
    ├── scratch-pad.md
    └── qa-authentication.md            # QA auth for deterministic RBAC testing
```

## Documentation Standards

Each feature module document should include:

1. **Feature Overview** - High-level description and business value
2. **Current Implementation Status** - What exists today
3. **Database Schema** - Tables, relationships, key fields
4. **API Endpoints** - Router methods and data contracts
5. **User Flows** - Step-by-step user journeys
6. **Gap Analysis** - Missing functionality to reach feature-complete
7. **Future Enhancements** - Planned improvements

## Maintenance Protocol

This documentation is **living** and must be updated:

- **After every feature implementation** - Update status and implementation details
- **After every gap analysis** - Document new findings
- **After every user flow mapping** - Add new flows discovered
- **Monthly** - Review and validate all documentation accuracy

See `DEVELOPMENT_PROTOCOLS.md` for the complete Feature Documentation Protocol.
