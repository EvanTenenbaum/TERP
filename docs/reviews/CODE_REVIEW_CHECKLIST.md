# TERP Code Review Checklist

## Phase 1: Discovery (Map the System)

### 1.1 Project Structure
- [ ] Analyze root directory structure
- [ ] Map client/ directory organization
- [ ] Map server/ directory organization
- [ ] Document shared/ directory contents
- [ ] Review scripts/ directory
- [ ] Catalog configuration files

### 1.2 Frontend Analysis
- [ ] List all pages/routes
- [ ] Catalog reusable components
- [ ] Document custom hooks
- [ ] Review state management patterns
- [ ] Analyze routing structure
- [ ] Check UI component library usage

### 1.3 Backend Analysis
- [ ] Map all tRPC routers
- [ ] Document service layer
- [ ] Review middleware
- [ ] Analyze authentication/authorization
- [ ] Document API endpoints
- [ ] Review error handling patterns

### 1.4 Database Analysis
- [ ] Document all tables
- [ ] Map relationships (foreign keys)
- [ ] Review indexes
- [ ] Check migration history
- [ ] Analyze query patterns
- [ ] Review data types and constraints

### 1.5 Integration Analysis
- [ ] Clerk authentication
- [ ] Gemini AI integration
- [ ] OpenAI integration
- [ ] Slack bot integration
- [ ] GitHub Actions workflows
- [ ] DigitalOcean deployment
- [ ] Sentry error tracking

### 1.6 Testing Analysis
- [ ] Unit test coverage
- [ ] Integration test coverage
- [ ] E2E test coverage
- [ ] Test quality assessment
- [ ] Mock/fixture patterns

---

## Phase 2: Deep Dive (Understand Each Component)

### 2.1 Core Business Logic
- [ ] Batch management system
- [ ] Inventory tracking
- [ ] Order processing
- [ ] Client management
- [ ] Calendar/scheduling
- [ ] Reporting/analytics
- [ ] User management
- [ ] Role-based access control

### 2.2 Data Flow Analysis
- [ ] Client → Server communication
- [ ] Server → Database queries
- [ ] Authentication flow
- [ ] Authorization checks
- [ ] Error propagation
- [ ] State synchronization

### 2.3 Performance Analysis
- [ ] Bundle size analysis
- [ ] Query performance
- [ ] Component render performance
- [ ] API response times
- [ ] Database query optimization
- [ ] Caching strategies

### 2.4 Security Analysis
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Authentication security
- [ ] Authorization enforcement
- [ ] Secrets management
- [ ] API rate limiting

---

## Phase 3: Quality Assessment

### 3.1 Code Quality
- [ ] TypeScript usage (no `any`)
- [ ] Consistent naming conventions
- [ ] Function complexity
- [ ] Code duplication
- [ ] Comment quality
- [ ] Error handling completeness

### 3.2 Architecture Quality
- [ ] Separation of concerns
- [ ] Dependency management
- [ ] Module coupling
- [ ] Code organization
- [ ] Design patterns usage
- [ ] Scalability considerations

### 3.3 Maintainability
- [ ] Documentation completeness
- [ ] Code readability
- [ ] Test maintainability
- [ ] Configuration management
- [ ] Deployment process
- [ ] Monitoring/observability

---

## Phase 4: Improvement Planning

### 4.1 Prioritization
- [ ] Critical issues (P0)
- [ ] High priority (P1)
- [ ] Medium priority (P2)
- [ ] Low priority (P3)
- [ ] Technical debt items

### 4.2 Roadmap Creation
- [ ] Quick wins (< 1 day)
- [ ] Short-term improvements (1-3 days)
- [ ] Medium-term refactors (1-2 weeks)
- [ ] Long-term architecture changes (> 2 weeks)

---

## Review Metrics

### Coverage Metrics
- Total files reviewed: 0
- Frontend files: 0
- Backend files: 0
- Test files: 0
- Configuration files: 0

### Issue Metrics
- Critical issues: 0
- High priority: 0
- Medium priority: 0
- Low priority: 0
- Technical debt items: 0

### Quality Scores (1-10)
- Code quality: TBD
- Architecture: TBD
- Testing: TBD
- Documentation: TBD
- Security: TBD
- Performance: TBD

