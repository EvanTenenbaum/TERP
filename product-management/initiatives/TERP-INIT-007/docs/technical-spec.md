# Technical Specification
# TERP-FEAT-001: Accounting Module - Smart Ledger Core & Transaction Splitting

**Feature ID:** TERP-FEAT-001  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## 1. Overview

This document provides the technical specification for implementing the Smart Ledger Core and Rule-Based Transaction Splitting features in the TERP accounting module. The implementation will leverage the existing TERP architecture while introducing new components for unified transaction entry and intelligent automation.

---

## 2. System Architecture

### 2.1 High-Level Architecture

The feature follows TERP's three-tier architecture:

**Frontend (React 19 + TypeScript)**
- Unified Transaction Entry component
- Context-aware suggestion engine (client-side)
- Template management UI
- Real-time validation system

**Backend (tRPC + Node.js)**
- Transaction processing API
- Suggestion rule engine
- Template CRUD operations
- Recurring transaction scheduler

**Database (MySQL)**
- Extended schema for templates and rules
- Transaction history for suggestions
- Audit trail enhancements

### 2.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  UnifiedTransactionEntry                                     │
│    ├─ TransactionForm (dynamic fields)                       │
│    ├─ SuggestionEngine (context-aware)                       │
│    ├─ ValidationEngine (real-time)                           │
│    └─ TemplateSelector (quick actions)                       │
├─────────────────────────────────────────────────────────────┤
│  TemplateManager                                             │
│    ├─ TemplateList                                           │
│    ├─ TemplateEditor                                         │
│    └─ RecurringScheduler                                     │
├─────────────────────────────────────────────────────────────┤
│  SplittingRuleManager (Phase 2)                              │
│    ├─ RuleBuilder                                            │
│    ├─ RuleList                                               │
│    └─ SplitPreview                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓ tRPC
┌─────────────────────────────────────────────────────────────┐
│                      Backend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  /server/routers/accounting.ts (extended)                    │
│    ├─ createTransaction (unified)                            │
│    ├─ getSuggestions                                         │
│    ├─ saveTemplate                                           │
│    ├─ getTemplates                                           │
│    └─ createRecurringSchedule                                │
├─────────────────────────────────────────────────────────────┤
│  /server/services/suggestionEngine.ts (new)                  │
│    ├─ analyzeTransactionHistory                              │
│    ├─ generateSuggestions                                    │
│    └─ updateRules                                            │
├─────────────────────────────────────────────────────────────┤
│  /server/services/recurringTransactions.ts (new)             │
│    ├─ scheduleRecurring                                      │
│    ├─ processScheduled                                       │
│    └─ notifyUsers                                            │
├─────────────────────────────────────────────────────────────┤
│  /server/services/splittingRules.ts (Phase 2, new)           │
│    ├─ evaluateRules                                          │
│    ├─ applySplit                                             │
│    └─ validateSplit                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓ Drizzle ORM
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Existing Tables:                                            │
│    - general_ledger                                          │
│    - chart_of_accounts                                       │
│    - invoices, bills, payments, expenses                     │
│                                                              │
│  New Tables:                                                 │
│    - transaction_templates                                   │
│    - recurring_schedules                                     │
│    - suggestion_rules                                        │
│    - splitting_rules (Phase 2)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Changes

### 3.1 New Tables

#### transaction_templates

```sql
CREATE TABLE transaction_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  organization_id INT NOT NULL,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  transaction_type ENUM('invoice', 'bill', 'payment', 'expense', 'journal_entry') NOT NULL,
  template_data JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_org_user (organization_id, user_id),
  INDEX idx_type (transaction_type)
);
```

#### recurring_schedules

```sql
CREATE TABLE recurring_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  organization_id INT NOT NULL,
  template_id INT NOT NULL,
  frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
  interval INT DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES transaction_templates(id) ON DELETE CASCADE,
  INDEX idx_next_run (next_run_date, is_active),
  INDEX idx_org (organization_id)
);
```

#### suggestion_rules

```sql
CREATE TABLE suggestion_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  organization_id INT NOT NULL,
  payee_name VARCHAR(255) NOT NULL,
  suggested_account_id INT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 1.00,
  usage_count INT DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (suggested_account_id) REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_org_payee (organization_id, payee_name),
  INDEX idx_payee (payee_name)
);
```

#### splitting_rules (Phase 2)

```sql
CREATE TABLE splitting_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  organization_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  condition_type ENUM('payee', 'amount_range', 'account') NOT NULL,
  condition_value VARCHAR(255) NOT NULL,
  splits JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org_active (organization_id, is_active)
);
```

### 3.2 Schema Extensions

No modifications to existing tables required. All new functionality uses new tables.

---

## 4. API Specification

### 4.1 Transaction Entry API

#### POST /api/accounting/transactions/create

**Description:** Create a new transaction (unified endpoint for all types)

**Request:**
```typescript
{
  type: 'invoice' | 'bill' | 'payment' | 'expense' | 'journal_entry';
  date: string; // ISO 8601
  description: string;
  entries: Array<{
    accountId: number;
    debit: number;
    credit: number;
  }>;
  metadata?: {
    payee?: string;
    invoiceNumber?: string;
    // ... type-specific fields
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  transactionId: number;
  ledgerEntries: Array<{ id: number; accountId: number; debit: number; credit: number; }>;
}
```

### 4.2 Suggestion API

#### GET /api/accounting/suggestions

**Description:** Get context-aware suggestions for accounts and payees

**Query Parameters:**
```typescript
{
  payee?: string;
  accountPrefix?: string;
  limit?: number; // default: 5
}
```

**Response:**
```typescript
{
  accounts: Array<{
    id: number;
    code: string;
    name: string;
    confidence: number; // 0.0 - 1.0
  }>;
  payees: Array<{
    name: string;
    lastUsed: string;
    frequency: number;
  }>;
}
```

### 4.3 Template API

#### POST /api/accounting/templates/create

**Request:**
```typescript
{
  name: string;
  description?: string;
  type: 'invoice' | 'bill' | 'payment' | 'expense' | 'journal_entry';
  templateData: object; // transaction structure
}
```

#### GET /api/accounting/templates/list

**Response:**
```typescript
{
  templates: Array<{
    id: number;
    name: string;
    type: string;
    createdAt: string;
  }>;
}
```

#### POST /api/accounting/templates/:id/apply

**Description:** Create a new transaction from a template

**Response:** Same as transaction create

### 4.4 Recurring Transaction API

#### POST /api/accounting/recurring/create

**Request:**
```typescript
{
  templateId: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 weeks
  startDate: string;
  endDate?: string;
}
```

#### GET /api/accounting/recurring/upcoming

**Query Parameters:**
```typescript
{
  days?: number; // default: 30
}
```

**Response:**
```typescript
{
  upcoming: Array<{
    scheduleId: number;
    templateName: string;
    nextRunDate: string;
    amount?: number;
  }>;
}
```

### 4.5 Splitting Rules API (Phase 2)

#### POST /api/accounting/splitting-rules/create

**Request:**
```typescript
{
  name: string;
  conditionType: 'payee' | 'amount_range' | 'account';
  conditionValue: string;
  splits: Array<{
    accountId: number;
    percentage?: number; // 0-100
    fixedAmount?: number;
  }>;
}
```

#### POST /api/accounting/splitting-rules/:id/evaluate

**Description:** Preview split for a transaction

**Request:**
```typescript
{
  amount: number;
  payee?: string;
}
```

**Response:**
```typescript
{
  matched: boolean;
  ruleId?: number;
  splits: Array<{
    accountId: number;
    accountName: string;
    amount: number;
  }>;
}
```

---

## 5. Frontend Implementation

### 5.1 Component Structure

#### UnifiedTransactionEntry Component

**Location:** `/client/src/components/accounting/UnifiedTransactionEntry.tsx`

**Props:**
```typescript
interface UnifiedTransactionEntryProps {
  initialType?: TransactionType;
  templateId?: number;
  onSuccess?: (transactionId: number) => void;
  onCancel?: () => void;
}
```

**State Management:**
```typescript
interface TransactionFormState {
  type: TransactionType;
  date: Date;
  description: string;
  entries: LedgerEntry[];
  metadata: Record<string, any>;
  validationErrors: ValidationError[];
  suggestions: Suggestion[];
}
```

**Key Features:**
- Dynamic form fields based on transaction type
- Real-time validation with inline error messages
- Context-aware suggestions as user types
- Keyboard shortcuts (Ctrl+S to save, Esc to cancel)
- Template quick-apply dropdown

### 5.2 Validation Engine

**Location:** `/client/src/lib/accounting/validation.ts`

**Functions:**
```typescript
function validateTransaction(transaction: Transaction): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check debits = credits
  const totalDebits = sumDebits(transaction.entries);
  const totalCredits = sumCredits(transaction.entries);
  if (totalDebits !== totalCredits) {
    errors.push({ field: 'entries', message: 'Debits must equal credits' });
  }
  
  // Check required fields
  if (!transaction.description) {
    errors.push({ field: 'description', message: 'Description is required' });
  }
  
  // Type-specific validation
  // ...
  
  return { isValid: errors.length === 0, errors };
}
```

### 5.3 Suggestion Engine (Client-Side)

**Location:** `/client/src/lib/accounting/suggestions.ts`

**Functions:**
```typescript
async function getSuggestions(
  payee: string,
  organizationId: number
): Promise<Suggestion[]> {
  // Call API to get suggestions based on transaction history
  const response = await trpc.accounting.getSuggestions.query({ payee });
  return response.accounts;
}

function rankSuggestions(
  suggestions: Suggestion[],
  context: TransactionContext
): Suggestion[] {
  // Sort by confidence score and recency
  return suggestions.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
}
```

---

## 6. Backend Implementation

### 6.1 Suggestion Engine Service

**Location:** `/server/services/suggestionEngine.ts`

**Core Logic:**
```typescript
export class SuggestionEngine {
  async generateSuggestions(
    payee: string,
    organizationId: number
  ): Promise<AccountSuggestion[]> {
    // Query suggestion_rules table
    const rules = await db
      .select()
      .from(suggestionRules)
      .where(
        and(
          eq(suggestionRules.organizationId, organizationId),
          like(suggestionRules.payeeName, `%${payee}%`)
        )
      )
      .orderBy(desc(suggestionRules.confidenceScore))
      .limit(5);
    
    return rules.map(rule => ({
      accountId: rule.suggestedAccountId,
      confidence: rule.confidenceScore,
      lastUsed: rule.lastUsedAt
    }));
  }
  
  async updateRule(
    payee: string,
    accountId: number,
    organizationId: number
  ): Promise<void> {
    // Upsert suggestion rule
    await db
      .insert(suggestionRules)
      .values({
        organizationId,
        payeeName: payee,
        suggestedAccountId: accountId,
        usageCount: 1
      })
      .onDuplicateKeyUpdate({
        usageCount: sql`usage_count + 1`,
        lastUsedAt: new Date(),
        confidenceScore: sql`LEAST(1.0, confidence_score + 0.1)`
      });
  }
}
```

### 6.2 Recurring Transaction Scheduler

**Location:** `/server/services/recurringTransactions.ts`

**Core Logic:**
```typescript
export class RecurringTransactionScheduler {
  async processScheduledTransactions(): Promise<void> {
    const today = new Date();
    
    // Find all schedules due to run
    const dueSchedules = await db
      .select()
      .from(recurringSchedules)
      .where(
        and(
          eq(recurringSchedules.isActive, true),
          lte(recurringSchedules.nextRunDate, today)
        )
      );
    
    for (const schedule of dueSchedules) {
      await this.createTransactionFromSchedule(schedule);
      await this.updateNextRunDate(schedule);
    }
  }
  
  private async createTransactionFromSchedule(
    schedule: RecurringSchedule
  ): Promise<void> {
    // Load template
    const template = await db
      .select()
      .from(transactionTemplates)
      .where(eq(transactionTemplates.id, schedule.templateId))
      .get();
    
    // Create transaction from template data
    await createTransaction({
      ...template.templateData,
      date: new Date()
    });
    
    // Update last run date
    await db
      .update(recurringSchedules)
      .set({ lastRunDate: new Date() })
      .where(eq(recurringSchedules.id, schedule.id));
  }
  
  private async updateNextRunDate(schedule: RecurringSchedule): Promise<void> {
    const nextDate = calculateNextDate(
      schedule.nextRunDate,
      schedule.frequency,
      schedule.interval
    );
    
    await db
      .update(recurringSchedules)
      .set({ nextRunDate: nextDate })
      .where(eq(recurringSchedules.id, schedule.id));
  }
}
```

**Cron Job Setup:**
```typescript
// In server/index.ts or dedicated scheduler
import cron from 'node-cron';

// Run every day at 6:00 AM
cron.schedule('0 6 * * *', async () => {
  const scheduler = new RecurringTransactionScheduler();
  await scheduler.processScheduledTransactions();
});
```

### 6.3 Splitting Rules Engine (Phase 2)

**Location:** `/server/services/splittingRules.ts`

**Core Logic:**
```typescript
export class SplittingRulesEngine {
  async evaluateRules(
    transaction: Partial<Transaction>,
    organizationId: number
  ): Promise<SplitResult | null> {
    // Find matching rule
    const rules = await db
      .select()
      .from(splittingRules)
      .where(
        and(
          eq(splittingRules.organizationId, organizationId),
          eq(splittingRules.isActive, true)
        )
      );
    
    for (const rule of rules) {
      if (this.matchesCondition(transaction, rule)) {
        return this.applySplit(transaction, rule);
      }
    }
    
    return null;
  }
  
  private matchesCondition(
    transaction: Partial<Transaction>,
    rule: SplittingRule
  ): boolean {
    switch (rule.conditionType) {
      case 'payee':
        return transaction.metadata?.payee === rule.conditionValue;
      case 'amount_range':
        // Parse range and check
        const [min, max] = rule.conditionValue.split('-').map(Number);
        const amount = transaction.entries?.reduce((sum, e) => sum + e.debit, 0) || 0;
        return amount >= min && amount <= max;
      default:
        return false;
    }
  }
  
  private applySplit(
    transaction: Partial<Transaction>,
    rule: SplittingRule
  ): SplitResult {
    const totalAmount = transaction.entries?.reduce((sum, e) => sum + e.debit, 0) || 0;
    const splits = JSON.parse(rule.splits);
    
    return {
      ruleId: rule.id,
      entries: splits.map((split: any) => ({
        accountId: split.accountId,
        amount: split.percentage 
          ? (totalAmount * split.percentage / 100)
          : split.fixedAmount
      }))
    };
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Frontend:**
- Validation logic (debits = credits, required fields)
- Suggestion ranking algorithm
- Form state management

**Backend:**
- Suggestion engine rule generation
- Recurring transaction date calculation
- Splitting rules evaluation

### 7.2 Integration Tests

- End-to-end transaction creation flow
- Template application
- Recurring transaction scheduling
- Rule-based splitting

### 7.3 Performance Tests

- Transaction entry response time (< 500ms)
- Suggestion generation (< 200ms)
- Validation feedback (< 100ms)
- Bulk recurring transaction processing

---

## 8. Deployment Strategy

### 8.1 Phase 1 Rollout

**Week 1-2:** Database migrations
- Create new tables
- Run data validation

**Week 3-4:** Backend deployment
- Deploy new API endpoints
- Enable suggestion engine
- Start recurring transaction scheduler

**Week 5-6:** Frontend deployment
- Deploy unified transaction entry UI
- Enable feature flag for beta users
- Gather feedback

**Week 7-8:** General availability
- Remove feature flag
- Monitor performance
- Address issues

### 8.2 Phase 2 Rollout

**Week 1-2:** Database and backend
- Create splitting_rules table
- Deploy splitting engine

**Week 3-4:** Frontend and testing
- Deploy rule builder UI
- Beta testing with power users

**Week 5-6:** General availability
- Full rollout
- Documentation and training

---

## 9. Monitoring & Observability

### 9.1 Metrics to Track

- Transaction entry time (p50, p95, p99)
- Suggestion acceptance rate
- Template usage rate
- Recurring transaction success rate
- Validation error rate
- API response times

### 9.2 Logging

- All transaction creations (audit trail)
- Suggestion rule updates
- Recurring transaction executions
- Validation failures
- API errors

### 9.3 Alerts

- Transaction entry time > 1s (p95)
- Recurring transaction failures > 5%
- API error rate > 1%
- Database query time > 500ms

---

## 10. Security Considerations

### 10.1 Authentication & Authorization

- All API endpoints require valid JWT token
- Organization-level data isolation
- Role-based access control for templates and rules

### 10.2 Data Validation

- Server-side validation for all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize user inputs)

### 10.3 Audit Trail

- Log all transaction modifications
- Track template and rule changes
- Maintain immutable audit log

---

## 11. Future Enhancements

### Potential Phase 3 Features

- Bulk transaction import/export
- Advanced reporting and analytics
- Mobile app support
- Collaborative features (multi-user approval workflows)
- Integration with external accounting systems (if needed)

---

## 12. References

- TERP Design System: `/home/ubuntu/TERP/docs/TERP_DESIGN_SYSTEM.md`
- Development Protocols: `/home/ubuntu/TERP/docs/DEVELOPMENT_PROTOCOLS.md`
- Database Schema: `/home/ubuntu/TERP/drizzle/schema.ts`
- Accounting Router: `/home/ubuntu/TERP/server/routers/accounting.ts`
