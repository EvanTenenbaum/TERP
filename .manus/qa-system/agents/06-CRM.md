# AGENT CRM — Clients, Party Model, Contacts & Supplier Profiles

## AGENT IDENTITY
```
Agent Name: CRM
Risk Level: 🟡 STRICT MODE
Primary Role: qa.salesmanager@terp.test
Estimated Time: 30 minutes
Run Order: Phase 2 (after REGRESSION passes)
Matrix Rows: ~45 flows
```

## YOUR MISSION

Test the Party Model implementation, TERI code uniqueness, client CRUD operations, and supplier profile management. The Party Model is critical — suppliers and buyers are BOTH in the `clients` table.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

```
You are the QA analyst for TERP CRM and Party Model. Manus is executing browser automation and reporting observations. Your job:

1. VALIDATE PARTY MODEL: clients table with isSeller/isBuyer flags
2. VERIFY TERI CODES: Unique identifier across all clients
3. TEST SUPPLIER PROFILES: 1:1 relationship with clients where isSeller=true
4. CHECK DEPRECATED VENDORS: No new code should use vendors table

PARTY MODEL RULES:
- Buyers: clients.isBuyer = true
- Suppliers: clients.isSeller = true + supplier_profiles (1:1)
- Dual role: isBuyer AND isSeller both true
- vendors table is DEPRECATED - flag any usage

TERI CODE RULES:
- Format: CLI-XXXXX (or similar prefix + sequential)
- Unique across ALL clients
- Auto-generated on creation
- Immutable after creation

Repository: https://github.com/EvanTenenbaum/TERP
Focus files: server/routers/clients/*, server/services/clients/*, db/schema/clients.ts
```

---

## TEST CATEGORIES

### CATEGORY 1: Party Model - Buyer Creation

```
TEST CRM-BUYER-001: Create buyer client

ACTION:
1. Login as qa.salesmanager@terp.test
2. Navigate to /clients/new
3. Fill in:
   - Name: qa-e2e-[DATE]-crm-buyer-001
   - Check "Buyer" / "Customer" checkbox
   - Leave "Supplier" unchecked
4. Save

OBSERVE AND REPORT:
- Client created?
- TERI code assigned?
- isBuyer indicator visible?
- Is supplier_profiles section absent?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-BUYER-002: Buyer appears in customer lists

ACTION:
1. After creating buyer, navigate to clients list
2. Filter by "Customers" or "Buyers" if filter exists
3. Search for the created client

OBSERVE AND REPORT:
- Does client appear in list?
- Any badge/icon showing "Customer"?
- Can you access client detail?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 2: Party Model - Supplier Creation

```
TEST CRM-SUPPLIER-001: Create supplier client

ACTION:
1. Navigate to /clients/new
2. Fill in:
   - Name: qa-e2e-[DATE]-crm-supplier-001
   - Check "Supplier" / "Vendor" checkbox
   - Leave "Buyer" unchecked
3. Save

OBSERVE AND REPORT:
- Client created?
- TERI code assigned?
- isSeller indicator visible?
- Is supplier_profiles section NOW visible?
- Can you enter supplier-specific fields? (license, payment terms)

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-SUPPLIER-002: Supplier profile fields

ACTION:
1. Edit the supplier created above
2. Look for supplier-specific fields:
   - License number
   - Payment terms
   - Bank details (if applicable)
3. Fill in values and save

OBSERVE AND REPORT:
- What supplier-specific fields exist?
- Are they saved correctly?
- Screenshot of supplier profile section

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 3: Party Model - Dual Role

```
TEST CRM-DUAL-001: Create client with both roles

ACTION:
1. Navigate to /clients/new
2. Fill in:
   - Name: qa-e2e-[DATE]-crm-dual-001
   - Check BOTH "Buyer" AND "Supplier"
3. Save

OBSERVE AND REPORT:
- Client created successfully?
- TERI code assigned?
- Both indicators visible (isBuyer AND isSeller)?
- Supplier profile section available?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-DUAL-002: Enable existing buyer as supplier

ACTION:
1. Find existing buyer-only client
2. Edit client
3. Check "Supplier" checkbox
4. Save

OBSERVE AND REPORT:
- Can you add supplier role?
- Is supplier_profiles section now visible?
- Previous buyer data intact?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 4: TERI Code Validation

```
TEST CRM-TERI-001: Auto-generation on create

ACTION:
1. Create new client
2. Observe TERI code

OBSERVE AND REPORT:
- Was TERI code auto-assigned?
- What format? (e.g., CLI-00042)
- Is it visible immediately after save?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-TERI-002: TERI uniqueness

ACTION:
1. Create client A → note TERI
2. Create client B → note TERI
3. Compare

OBSERVE AND REPORT:
- Client A TERI: ____
- Client B TERI: ____
- Are they different?
- Sequential?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-TERI-003: TERI immutability

ACTION:
1. Find existing client
2. Try to edit the TERI code field

OBSERVE AND REPORT:
- Is TERI field editable?
- If you try to change it, is it blocked?

SEND TO CLAUDE FOR ANALYSIS
Expected: TERI should NOT be editable after creation
```

```
TEST CRM-TERI-004: Search by TERI code

ACTION:
1. Note a client's TERI code
2. Use global search to search for that exact TERI
3. Observe results

OBSERVE AND REPORT:
- Did search find the client?
- Is TERI shown in search results?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 5: Client CRUD Operations

```
TEST CRM-CRUD-001: Create client with all fields

ACTION:
1. Create new client with all available fields filled
2. Save

OBSERVE AND REPORT:
- All fields saved?
- Screenshot of detail view

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-CRUD-002: Update client

ACTION:
1. Find existing client
2. Edit multiple fields
3. Save

OBSERVE AND REPORT:
- All changes saved?
- Reflected in list view?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-CRUD-003: Archive/delete client

ACTION:
1. Find client with no open orders/invoices
2. Archive or delete

OBSERVE AND REPORT:
- Action available?
- Client hidden from active list?
- Can filter to see archived?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-CRUD-004: Cannot delete client with open orders

ACTION:
1. Find client with open orders
2. Try to delete

OBSERVE AND REPORT:
- Is deletion blocked?
- What error message?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be blocked
```

### CATEGORY 6: Contacts (Multi-Contact)

```
TEST CRM-CONTACT-001: Add contact to client

ACTION:
1. Open client detail
2. Add new contact with name, email, phone, role
3. Save

OBSERVE AND REPORT:
- Contact added?
- Visible in contacts list?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-CONTACT-002: Primary contact

ACTION:
1. Add multiple contacts
2. Set one as primary
3. Change primary to another

OBSERVE AND REPORT:
- Only one primary at a time?
- Previous primary demoted?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 7: Deprecated Vendors Check

```
TEST CRM-DEPRECATED-001: UI uses "Suppliers" not "Vendors"

ACTION:
1. Navigate through client-related pages
2. Look for any "Vendors" label (deprecated term)

OBSERVE AND REPORT:
- Any UI says "Vendors"?
- List all occurrences

SEND TO CLAUDE FOR ANALYSIS
Expected: Should use "Suppliers" everywhere
```

```
TEST CRM-DEPRECATED-002: API uses clients table

ACTION:
1. Open DevTools > Network
2. Create or view a supplier
3. Check API endpoints

OBSERVE AND REPORT:
- Endpoint is /clients or /vendors?
- Response has clientId or vendorId?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should use clients, not vendors
```

### CATEGORY 8: Validation

```
TEST CRM-VALID-001: Name required

ACTION:
1. Try to create client without name

OBSERVE AND REPORT:
- Validation error?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST CRM-VALID-002: Must be buyer or seller

ACTION:
1. Create client with neither role checked

OBSERVE AND REPORT:
- Allowed?
- Validation error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should require at least one role
```

```
TEST CRM-VALID-003: Unicode in name

ACTION:
1. Create client: "Tëst Çompañy 日本語"
2. Save and view

OBSERVE AND REPORT:
- Saved correctly?
- Displays correctly?

SEND TO CLAUDE FOR ANALYSIS
```

---

## FINAL REPORT FORMAT

```markdown
## AGENT CRM — Final Report

### Summary
- Total Tests: [N]
- PASS: [N]
- FAIL: [N]
- BLOCKED: [N]

### Party Model
| Scenario | Works |
|----------|-------|
| Create buyer | ✅ |
| Create supplier | ✅ |
| Create dual-role | ✅ |
| Enable supplier on buyer | ✅ |

### TERI Code
| Check | Status |
|-------|--------|
| Auto-generated | ✅ |
| Unique | ✅ |
| Immutable | ✅ |
| Searchable | ✅ |

### Deprecated Vendors
| Check | Status |
|-------|--------|
| UI uses "Suppliers" | ✅ |
| API uses clients | ✅ |

### Findings
| ID | Test | Severity | Description |
|----|------|----------|-------------|

AWAITING CLAUDE FINAL ANALYSIS
```
