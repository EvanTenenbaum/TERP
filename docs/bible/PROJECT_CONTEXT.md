# TERP Project Context

**Last Updated:** October 23, 2025  
**Current Version:** terp-redesign v2.0 (Checkpoint: af56b9b5)  
**Purpose:** Living document tracking current project state, decisions, and status

---

## Current Project State

### Active Projects

1. **terp-redesign** (Primary Active Project)
   - **Location:** `/home/ubuntu/terp-redesign`
   - **Status:** Production-ready with Inventory Module
   - **Version:** af56b9b5
   - **Dev Server:** https://3000-ifpycsnmbvrec0h03kl1v-9fa449a6.manusvm.computer
   - **Stack:** React 19, Next.js 16, Tailwind CSS 4, shadcn/ui
   - **Features:** Full-stack with database (web-db-user)

2. **TERP** (Legacy/Original Repository)
   - **Location:** `/home/ubuntu/TERP`
   - **Status:** Legacy codebase, reference only
   - **GitHub:** EvanTenenbaum/TERP
   - **Stack:** Next.js 14.2.5 (outdated)
   - **Note:** Not actively developed; terp-redesign is the current focus

### Completed Implementations

#### terp-redesign v1.0 Features
- ✅ **Application Shell**
  - Persistent sidebar navigation
  - Global search header
  - Responsive layout
  
- ✅ **Dashboard Page** (`/`)
  - Key metrics cards (Quotes, Orders, Inventory, Revenue)
  - Recent quotes list
  - Quick actions panel
  
- ✅ **Sales & Quotes Page** (`/quotes`)
  - Data table with sorting
  - Status badges (approved, pending, rejected)
  - Action buttons
  - Mock data integration

- ✅ **Inventory Module** (`/inventory`)
  - Complete batch management system
  - Intake flow with comprehensive form
  - Batch detail drawer with audit trail
  - Open tasks dashboard
  - Search and filter functionality
  - Database-backed with 9 tables
  - Status state machine (7 states)
  - COGS modes (FIXED, FLOOR, RANGE)
  - Location tracking (site, zone, rack, shelf, bin)
  - Audit logging for all operations

- ✅ **Navigation System**
  - 7 main navigation items
  - Active state indicators
  - Icon-based navigation
  - Client-side routing (wouter)

### Pending Implementations

- ⏳ **Additional Pages**
  - Orders page (`/orders`)
  - Customers page (`/customers`)
  - Analytics page (`/analytics`)
  - Settings page (`/settings`)

- ⏳ **Advanced Features**
  - Data table filtering and pagination
  - Form implementations (create/edit quotes)
  - Modal dialogs
  - Toast notifications
  - Advanced search functionality

- ✅ **Backend Integration**
  - ✅ API endpoints (tRPC)
  - ✅ Database schema (Drizzle ORM)
  - ✅ Authentication (built-in)
  - ⏳ Real-time data

---

## Technology Stack

### Current Stack (terp-redesign)

**Frontend:**
- React 19
- Next.js 16.0.0 (Turbopack)
- TypeScript 5.x
- Tailwind CSS 4
- shadcn/ui components
- Wouter (routing)
- Lucide React (icons)

**Build Tools:**
- Vite (dev server)
- ESLint
- PostCSS

**Backend:**
- tRPC (type-safe API)
- Drizzle ORM (database)
- PostgreSQL (database)
- Node.js server

**Deployment:**
- Manus webdev platform
- Full-stack hosting (web-db-user)
- Database and server features enabled

### Design System

**Components:** shadcn/ui
- Button, Card, Input, Badge
- Custom components in `/client/src/components/`

**Styling:**
- Tailwind utility-first
- CSS variables for theming
- Responsive breakpoints: mobile (320px+), tablet (768px+), desktop (1024px+)

**Colors:**
- Primary: Blue (#2563eb)
- Success: Green (#16a34a)
- Warning: Yellow (#eab308)
- Danger: Red (#dc2626)
- Muted: Gray (#6b7280)

---

## Architecture Decisions

### Key Decisions Made

1. **Fresh Start with terp-redesign**
   - **Decision:** Create new project instead of fixing legacy TERP
   - **Reason:** Legacy project had incompatible Next.js 14.2.5, broken configurations
   - **Date:** October 23, 2025
   - **Impact:** Clean slate with modern stack

2. **Static Frontend First**
   - **Decision:** Start with web-static, upgrade to web-db-user later
   - **Reason:** Establish UI/UX foundation before backend complexity
   - **Date:** October 23, 2025
   - **Impact:** Faster initial development, clear upgrade path

3. **Mock Data Strategy**
   - **Decision:** Use realistic mock data in components
   - **Reason:** Enable full UI development without backend dependency
   - **Date:** October 23, 2025
   - **Impact:** Production-ready UI, easy to swap for real API calls

4. **Component Library: shadcn/ui**
   - **Decision:** Use shadcn/ui instead of custom components
   - **Reason:** Production-ready, accessible, customizable, well-documented
   - **Date:** October 23, 2025
   - **Impact:** Faster development, consistent design, accessibility built-in

5. **Persistent Sidebar Navigation**
   - **Decision:** Use sidebar instead of top navigation
   - **Reason:** ERP systems benefit from persistent context, follows research best practices
   - **Date:** October 23, 2025
   - **Impact:** Better UX for complex workflows, more screen space for content

### Pending Decisions

- [ ] **State Management:** Determine if we need Zustand/Redux or keep local state
- [ ] **Data Fetching:** Choose between React Query, SWR, or native fetch
- [ ] **Form Library:** Decide on React Hook Form vs. Formik vs. custom
- [ ] **Testing Strategy:** Unit tests (Vitest), E2E tests (Playwright), coverage targets
- [ ] **Backend Framework:** When upgrading to web-db-user, confirm database choice

---

## File Structure

### terp-redesign Structure

```
/home/ubuntu/terp-redesign/
├── client/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/      # AppShell, AppHeader, AppSidebar
│   │   │   ├── ui/          # shadcn/ui components (Button, Card, Badge, Input)
│   │   │   └── ErrorBoundary.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx     # Dashboard
│   │   │   ├── Quotes.tsx   # Sales & Quotes
│   │   │   └── NotFound.tsx
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/
│   │   │   └── utils.ts     # Utility functions (cn, etc.)
│   │   ├── App.tsx          # Main app with routing
│   │   ├── main.tsx         # React entry point
│   │   └── index.css        # Global styles + Tailwind
├── docs/                    # Documentation (will be moved to TERP/docs/bible)
│   ├── DEVELOPMENT_PROTOCOLS.md
│   ├── TERP_DESIGN_SYSTEM.md
│   └── TERP_IMPLEMENTATION_STRATEGY.md
├── shared/                  # Placeholder for compatibility
│   └── const.ts
├── server/                  # Placeholder for compatibility
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### TERP Repository Structure (GitHub)

```
/home/ubuntu/TERP/
├── docs/
│   └── bible/               # The Bible - authoritative reference
│       ├── DEVELOPMENT_PROTOCOLS.md
│       ├── TERP_DESIGN_SYSTEM.md
│       ├── TERP_IMPLEMENTATION_STRATEGY.md
│       ├── PROJECT_CONTEXT.md (this file)
│       └── CHANGELOG.md
├── src/                     # Legacy source code
├── components/              # Legacy components
└── [various legacy files]
```

---

## Known Issues & Limitations

### Current Limitations

1. **Mock Data Only**
   - All data is hardcoded in components
   - No persistence between sessions
   - No real CRUD operations
   - **Resolution:** Upgrade to web-db-user feature

2. **No Authentication**
   - No user login/logout
   - No role-based access control
   - No user profiles
   - **Resolution:** Upgrade to web-db-user feature

3. **Limited Interactivity**
   - Buttons are functional but don't perform real actions
   - Forms not yet implemented
   - No data editing capabilities
   - **Resolution:** Implement forms and state management

4. **Placeholder Routes**
   - Orders, Inventory, Customers, Analytics, Settings routes return 404
   - Only Dashboard and Quotes pages implemented
   - **Resolution:** Implement remaining pages

### Known Technical Debt

- None currently (fresh codebase)

---

## Recent Changes

### October 23, 2025

**Major Changes:**
- Created terp-redesign project from scratch
- Implemented application shell with sidebar navigation
- Built Dashboard page with metrics and quick actions
- Built Sales & Quotes page with data table
- Established design system based on comprehensive UX/UI research
- Created The Bible (DEVELOPMENT_PROTOCOLS.md)
- Saved initial checkpoint (1fa68187)

**Files Modified:**
- Created: `client/src/components/layout/AppShell.tsx`
- Created: `client/src/components/layout/AppHeader.tsx`
- Created: `client/src/components/layout/AppSidebar.tsx`
- Created: `client/src/pages/Home.tsx`
- Created: `client/src/pages/Quotes.tsx`
- Created: `client/src/components/ui/badge.tsx`
- Created: `client/src/components/ui/button.tsx`
- Modified: `client/src/App.tsx` (added routing and AppShell)

**Decisions Made:**
- Use terp-redesign as primary project
- Start with static frontend
- Use shadcn/ui component library
- Implement persistent sidebar navigation
- Use mock data for initial development

---

## Next Steps

### Immediate Priorities

1. **Implement Remaining Pages**
   - Orders page with order management table
   - Inventory page with stock tracking
   - Customers page with customer directory
   - Analytics page with charts and insights
   - Settings page with configuration options

2. **Enhance Data Tables**
   - Add sorting functionality
   - Implement filtering
   - Add pagination
   - Enable column customization

3. **Form Implementations**
   - Create Quote form
   - Edit Quote form
   - Form validation
   - Error handling

4. **Advanced Features**
   - Modal dialogs for actions
   - Toast notifications for feedback
   - Advanced search with filters
   - Keyboard shortcuts

### Future Roadmap

1. **Backend Integration** (Requires web-db-user upgrade)
   - Database schema design
   - API endpoints
   - Authentication system
   - Real-time data updates

2. **Advanced Features**
   - Reporting and analytics
   - Export functionality (PDF, Excel)
   - Bulk operations
   - Workflow automation

3. **Production Readiness**
   - Comprehensive testing
   - Performance optimization
   - Security audit
   - Deployment to production

---

## Contact & Maintenance

**Project Owner:** Evan Tenenbaum  
**Repository:** EvanTenenbaum/TERP  
**Active Development:** terp-redesign project  

**Maintenance Notes:**
- Update this file after significant changes
- Record all architectural decisions
- Track known issues and resolutions
- Maintain accurate file structure documentation

---

**Remember:** This is a living document. Update it whenever:
- New features are implemented
- Architectural decisions are made
- Known issues are discovered or resolved
- File structure changes significantly
- Technology stack is updated

