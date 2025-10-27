# TERP - Modern ERP System

A world-class, production-ready ERP system with intelligent needs matching, comprehensive accounting, and modern authentication.

**🌐 Live Production:** https://terp-app-b9s35.ondigitalocean.app

---

## 🚀 Quick Start

### Local Development
```bash
cd /home/ubuntu/TERP
pnpm install
pnpm dev
```

### Production Deployment
```bash
git push origin main  # Auto-deploys to DigitalOcean
```

---

## 📋 Current Status

**Version:** 0f52d82b (October 27, 2025)  
**Status:** ✅ Deployed and Active  
**Platform:** DigitalOcean App Platform  
**Database:** MySQL 8.0

### ✅ Completed Modules

1. **Dashboard & Homepage** - KPIs, widgets, quick actions
2. **Inventory Management** - Complete batch tracking system
3. **Accounting Module** - Full double-entry accounting with AR/AP
4. **Client Management** - Client profiles with credit tracking
5. **Pricing Engine** - Rules and profiles for dynamic pricing
6. **Quote Management** - Quote creation and tracking
7. **Order Management** - Order processing workflow
8. **Needs & Matching Intelligence** - AI-powered inventory matching
9. **Clerk Authentication** - Modern authentication with no IP restrictions

### 🎯 Recent Additions

**Needs & Matching Intelligence Module:**
- Multi-source matching (inventory + vendor supply)
- Confidence scoring (0-100)
- Historical purchase analysis
- Automatic quote creation
- 53 passing tests

**Clerk Authentication:**
- Replaced Butterfly Effect OAuth
- No IP restrictions (works with DigitalOcean)
- Email/password and social login
- Session management with JWT
- User sync with local database

---

## 🏗️ Architecture

**Frontend:**
- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui components
- Vite build tool
- Clerk React SDK

**Backend:**
- Node.js + Express + tRPC
- Drizzle ORM
- MySQL 8.0 database
- Clerk Backend SDK
- JWT session management

**Infrastructure:**
- DigitalOcean App Platform
- Managed MySQL database
- Auto-deploy on git push
- SSL/HTTPS enabled

**Features:**
- 20+ database tables
- 80+ tRPC API endpoints
- 100% mobile-optimized
- Zero TypeScript errors
- 53 passing tests

---

## 📁 Project Structure

```
/home/ubuntu/TERP/
├── client/src/              # Frontend React application
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components (routes)
│   │   ├── SignIn.tsx      # Clerk sign-in page
│   │   ├── SignUp.tsx      # Clerk sign-up page
│   │   └── ...
│   └── lib/                # Utilities and helpers
├── server/                  # Backend tRPC API
│   ├── _core/              # Core server functionality
│   │   ├── clerkAuth.ts    # Clerk authentication service
│   │   └── context.ts      # tRPC context with auth
│   ├── routers/            # API endpoints
│   ├── services/           # Business logic
│   │   ├── matchingEngineEnhanced.ts
│   │   └── needsMatchingService.ts
│   └── db/                 # Data access layers
├── drizzle/                # Database schema
│   └── schema.ts           # MySQL schema definitions
├── docs/                   # Documentation
│   ├── DEPLOYMENT_STATUS.md
│   ├── CLERK_AUTHENTICATION.md
│   ├── NEEDS_AND_MATCHING_MODULE.md
│   └── DEVELOPMENT_PROTOCOLS.md
└── tests/                  # Test suites
```

---

## 📚 Documentation

**Essential Reading:**

1. **[DEPLOYMENT_STATUS.md](./docs/DEPLOYMENT_STATUS.md)** - Current Deployment Info
   - Live URL and infrastructure details
   - Environment variables
   - Monitoring and troubleshooting
   - Recent changes and next steps

2. **[CLERK_AUTHENTICATION.md](./docs/CLERK_AUTHENTICATION.md)** - Authentication Guide
   - Architecture and flow
   - Setup and configuration
   - API reference
   - Troubleshooting

3. **[NEEDS_AND_MATCHING_MODULE.md](./docs/NEEDS_AND_MATCHING_MODULE.md)** - Feature Documentation
   - Matching engine details
   - Confidence scoring algorithm
   - API endpoints
   - Usage examples

4. **[DEVELOPMENT_PROTOCOLS.md](./docs/DEVELOPMENT_PROTOCOLS.md)** - The Bible
   - System integration protocols
   - Production-ready code standards
   - Quality checklists

---

## 🎯 Key Features

### Needs & Matching Intelligence (NEW)

**Capabilities:**
- Intelligent matching between client needs and available inventory
- Multi-source matching (inventory + vendor supply)
- Confidence scoring (0-100) based on:
  - Product/strain exact match
  - Historical purchase patterns
  - Quantity availability
  - Price competitiveness
- Automatic quote creation from matches
- Match history tracking

**Pages:**
- `/needs` - Manage client needs
- `/vendor-supply` - Track vendor inventory
- `/clients/:id` - Client profile with "Needs & History" tab

### Authentication (Clerk)

**Features:**
- Email/password authentication
- Social login (Google, GitHub, etc.)
- Multi-factor authentication (MFA)
- Session management with JWT
- User management dashboard
- No IP restrictions

**Routes:**
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page

### Accounting Module

**10 Pages:**
- Accounting Dashboard - Financial overview
- Chart of Accounts - Account hierarchy
- General Ledger - Journal entries
- Fiscal Periods - Period management
- Invoices - AR management
- Bills - AP management
- Payments - Payment tracking
- Bank Accounts - Cash management
- Bank Transactions - Reconciliation
- Expenses - Expense tracking

**Features:**
- Double-entry accounting
- AR/AP aging reports
- Bank reconciliation
- Expense reimbursement
- Trial balance
- Fiscal period management

### Inventory Module

**Features:**
- Batch lifecycle tracking
- Status management (Awaiting Intake → Sold)
- Advanced filtering and sorting
- Dashboard statistics
- Mobile card view
- Desktop table view

### Client Management

**Features:**
- Client profiles with contact info
- Credit limit tracking
- Purchase history
- Client needs management
- Pricing profile assignment

### Pricing Engine

**Features:**
- Rule-based pricing
- Pricing profiles per client
- Dynamic price calculation
- Bulk pricing rules

---

## 📱 Mobile Optimization

**100% Mobile-Optimized:**
- Mobile-first responsive design
- Single-column layouts on mobile
- Stacked buttons and filters
- Touch-friendly tap targets
- Responsive typography

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 🛠️ Development

### Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Check TypeScript
pnpm run check

# Run tests
pnpm test

# Build for production
pnpm build

# Database migrations
pnpm db:push
```

### Environment Variables

**Required for Local Development:**
```bash
# .env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlYXItY2FyZGluYWwtNjMuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_gLGRGGDzMjmxvYMdxTfPuRQQeUMpvbOQkJBKBJCZBD
JWT_SECRET=your-jwt-secret-here
DATABASE_URL=mysql://user:pass@localhost:3306/terp
VITE_APP_TITLE=TERP
VITE_APP_ID=terp-app
NODE_ENV=development
```

---

## 🚀 Deployment

### DigitalOcean App Platform

**Live URL:** https://terp-app-b9s35.ondigitalocean.app

**Auto-Deploy:**
```bash
git add .
git commit -m "Your changes"
git push origin main  # Triggers automatic deployment
```

**Manual Deployment via API:**
```bash
# Update environment variables
curl -X PUT \
  -H "Authorization: Bearer $DO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"spec": {...}}' \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
```

**Monitoring:**
- Dashboard: https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4
- Logs: Available via DigitalOcean dashboard or API
- Metrics: CPU, memory, and bandwidth usage

---

## 🔧 Troubleshooting

### Authentication Issues

**Problem:** "Missing Clerk Publishable Key"  
**Solution:** Add `VITE_CLERK_PUBLISHABLE_KEY` to environment variables

**Problem:** Authentication fails silently  
**Solution:** Verify `CLERK_SECRET_KEY` in production environment

### Database Issues

**Problem:** Connection timeout  
**Solution:** Check `DATABASE_URL` and verify database is running

**Problem:** Migration errors  
**Solution:** Run `pnpm db:push` to sync schema

### Build Issues

**Problem:** TypeScript errors  
**Solution:** Run `pnpm run check` and fix errors before deploying

**Problem:** Build timeout  
**Solution:** Check DigitalOcean logs for specific error messages

---

## 📊 Database Schema

**20+ Production Tables:**

**Inventory (5 tables):**
- batches, products, brands, vendors, strains

**Accounting (12 tables):**
- accounts, ledgerEntries, fiscalPeriods
- invoices, invoiceLineItems
- bills, billLineItems
- payments
- bankAccounts, bankTransactions
- expenses, expenseCategories

**Needs & Matching (3 tables):**
- clientNeeds, vendorSupply, matchRecords

**Core (3 tables):**
- users, clients, quotes

---

## 🧪 Testing

**Test Coverage:**
- 53 passing tests
- 3 test suites
- Matching engine tests
- Confidence scoring tests
- Quote creation tests

**Run Tests:**
```bash
pnpm test
```

---

## 🎨 Design System

**Principles:**
- Card-based layouts
- Color-coded status indicators
- Persistent sidebar navigation
- Progressive disclosure
- Clarity over cleverness

**Components:**
- shadcn/ui base components
- Custom accounting components
- Custom inventory components
- Custom needs matching components
- Responsive layouts

---

## 🚦 API Endpoints

**80+ tRPC Endpoints:**

**Authentication:**
- `auth.me` - Get current user
- `auth.logout` - Sign out

**Inventory:**
- `inventory.*` - 6 endpoints

**Accounting:**
- `accounting.accounts.*` - 7 endpoints
- `accounting.ledger.*` - 5 endpoints
- `accounting.fiscalPeriods.*` - 7 endpoints
- `accounting.invoices.*` - 9 endpoints
- `accounting.bills.*` - 9 endpoints
- `accounting.payments.*` - 6 endpoints
- `accounting.bankAccounts.*` - 6 endpoints
- `accounting.bankTransactions.*` - 6 endpoints
- `accounting.expenseCategories.*` - 4 endpoints
- `accounting.expenses.*` - 9 endpoints

**Needs & Matching:**
- `clientNeedsEnhanced.*` - 10 endpoints
- `vendorSupply.*` - 6 endpoints

**Clients & Quotes:**
- `clients.*` - 8 endpoints
- `quotes.*` - 6 endpoints

---

## 📈 Next Steps

### Immediate Priorities

1. ✅ Test authentication flow on live site
2. ✅ Verify all features work with Clerk
3. Configure custom domain (optional)
4. Set up monitoring and alerts

### Future Enhancements

- Email notifications for high-confidence matches
- Machine learning for improved confidence scoring
- Predictive analytics for inventory needs
- CRM integration
- Mobile app (React Native)

---

## 🤝 Contributing

This project follows strict quality standards:

- ✅ Zero TypeScript errors
- ✅ Production-ready code (no placeholders)
- ✅ Mobile-first responsive design
- ✅ Comprehensive error handling
- ✅ Full documentation
- ✅ Test coverage for critical features

See [DEVELOPMENT_PROTOCOLS.md](./docs/DEVELOPMENT_PROTOCOLS.md) for detailed guidelines.

---

## 📝 License

Proprietary - All rights reserved

---

## 🔗 Quick Links

- **Live Application:** https://terp-app-b9s35.ondigitalocean.app
- **GitHub Repository:** https://github.com/EvanTenenbaum/TERP
- **DigitalOcean Dashboard:** https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4
- **Clerk Dashboard:** https://dashboard.clerk.com
- **Documentation:** `/docs/`
- **Database Schema:** `/drizzle/schema.ts`
- **API Routers:** `/server/routers/`
- **Frontend Pages:** `/client/src/pages/`

---

## 💰 Cost

**Monthly Infrastructure:**
- DigitalOcean App: $5/month
- MySQL Database: $15/month
- **Total: $20/month**

**Free Tier Services:**
- Clerk Authentication: Free tier (10,000 MAU)
- GitHub: Free for public repositories

---

**Built with ❤️ by Manus AI**

For questions or support, see [DEPLOYMENT_STATUS.md](./docs/DEPLOYMENT_STATUS.md) or [CLERK_AUTHENTICATION.md](./docs/CLERK_AUTHENTICATION.md)

