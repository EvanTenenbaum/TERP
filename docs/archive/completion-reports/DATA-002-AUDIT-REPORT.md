[dotenv@17.2.3] injecting env (0) from .env -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
[dotenv@17.2.3] injecting env (1) from .env.production -- tip: ⚙️ suppress all logs with { quiet: true }
[dotenv@17.2.3] injecting env (0) from .env -- tip: ⚙️ load multiple .env files with { path: ['.env.local', '.env'] }
🔍 Starting Referential Integrity Audit...

Checking orders without items...
Checking orphaned order items...
Checking order items with invalid batch...
Checking inventory movements...
Checking invoices without line items...
Checking payments without invoices...
Checking ledger entries...
Checking orders without invoices...
Error checking orders without invoices: DrizzleQueryError: Failed query:
SELECT o.id, o.order_number as orderNumber, o.invoiceId
FROM orders o
WHERE o.orderType = 'SALE'
AND o.is_draft = 0
AND (o.invoiceId IS NULL OR o.invoiceId NOT IN (SELECT id FROM invoices))
LIMIT 100

params:
at MySql2PreparedQuery.queryWithCache (/workspace/node*modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql-core/session.ts:79:11)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async MySql2PreparedQuery.execute (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql2/session.ts:100:16)
at async <anonymous> (/workspace/scripts/audit-data-relationships.ts:372:14)
at async retryQuery (/workspace/scripts/audit-data-relationships.ts:43:14)
at async checkOrdersWithoutInvoices (/workspace/scripts/audit-data-relationships.ts:371:20)
at async runAudit (/workspace/scripts/audit-data-relationships.ts:483:3) {
query: '\n' +
' SELECT o.id, o.order_number as orderNumber, o.invoiceId\n' +
' FROM orders o\n' +
" WHERE o.orderType = 'SALE'\n" +
' AND o.is_draft = 0\n' +
' AND (o.invoiceId IS NULL OR o.invoiceId NOT IN (SELECT id FROM invoices))\n' +
' LIMIT 100\n' +
' ',
params: [],
cause: Error: Unknown column 'o.invoiceId' in 'field list'
at PromisePool.query (/workspace/node_modules/.pnpm/mysql2@3.15.3/node_modules/mysql2/lib/promise/pool.js:36:22)
at <anonymous> (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql2/session.ts:101:25)
at MySql2PreparedQuery.queryWithCache (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql-core/session.ts:77:18)
at MySql2PreparedQuery.execute (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql2/session.ts:100:27)
at MySql2Session.execute (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql-core/session.ts:197:5)
at MySql2Database.execute (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node_modules/src/mysql-core/db.ts:477:23)
at <anonymous> (/workspace/scripts/audit-data-relationships.ts:372:23)
at retryQuery (/workspace/scripts/audit-data-relationships.ts:43:20)
at checkOrdersWithoutInvoices (/workspace/scripts/audit-data-relationships.ts:371:26)
at runAudit (/workspace/scripts/audit-data-relationships.ts:483:9) {
code: 'ER_BAD_FIELD_ERROR',
errno: 1054,
sql: '\n' +
' SELECT o.id, o.order_number as orderNumber, o.invoiceId\n' +
' FROM orders o\n' +
" WHERE o.orderType = 'SALE'\n" +
' AND o.is_draft = 0\n' +
' AND (o.invoiceId IS NULL OR o.invoiceId NOT IN (SELECT id FROM invoices))\n' +
' LIMIT 100\n' +
' ',
sqlState: '42S22',
sqlMessage: "Unknown column 'o.invoiceId' in 'field list'"
}
}
Checking client activity...
Error checking client activity: DrizzleQueryError: Failed query:
SELECT ca.id, ca.clientId
FROM clientActivity ca
LEFT JOIN clients c ON ca.clientId = c.id
WHERE c.id IS NULL
LIMIT 100

params:
at MySql2PreparedQuery.queryWithCache (/workspace/node*modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql-core/session.ts:79:11)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async MySql2PreparedQuery.execute (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql2/session.ts:100:16)
at async <anonymous> (/workspace/scripts/audit-data-relationships.ts:417:14)
at async retryQuery (/workspace/scripts/audit-data-relationships.ts:43:14)
at async checkClientActivityWithoutClient (/workspace/scripts/audit-data-relationships.ts:416:20)
at async runAudit (/workspace/scripts/audit-data-relationships.ts:486:3) {
query: '\n' +
' SELECT ca.id, ca.clientId\n' +
' FROM clientActivity ca\n' +
' LEFT JOIN clients c ON ca.clientId = c.id\n' +
' WHERE c.id IS NULL\n' +
' LIMIT 100\n' +
' ',
params: [],
cause: Error: Table 'defaultdb.clientActivity' doesn't exist
at PromisePool.query (/workspace/node_modules/.pnpm/mysql2@3.15.3/node_modules/mysql2/lib/promise/pool.js:36:22)
at <anonymous> (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql2/session.ts:101:25)
at MySql2PreparedQuery.queryWithCache (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql-core/session.ts:77:18)
at MySql2PreparedQuery.execute (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql2/session.ts:100:27)
at MySql2Session.execute (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node*modules/src/mysql-core/session.ts:197:5)
at MySql2Database.execute (/workspace/node_modules/.pnpm/drizzle-orm@0.44.7*@opentelemetry+api@1.9.0_@types+pg@8.15.5_better-sqlite3@12.5.0_mysql2@3.15.3/node_modules/src/mysql-core/db.ts:477:23)
at <anonymous> (/workspace/scripts/audit-data-relationships.ts:417:23)
at retryQuery (/workspace/scripts/audit-data-relationships.ts:43:20)
at checkClientActivityWithoutClient (/workspace/scripts/audit-data-relationships.ts:416:26)
at runAudit (/workspace/scripts/audit-data-relationships.ts:486:9) {
code: 'ER_NO_SUCH_TABLE',
errno: 1146,
sql: '\n' +
' SELECT ca.id, ca.clientId\n' +
' FROM clientActivity ca\n' +
' LEFT JOIN clients c ON ca.clientId = c.id\n' +
' WHERE c.id IS NULL\n' +
' LIMIT 100\n' +
' ',
sqlState: '42S02',
sqlMessage: "Table 'defaultdb.clientActivity' doesn't exist"
}
}

============================================================
📊 AUDIT RESULTS
============================================================

🔴 Critical Issues: 1
🟠 High Issues: 3
🟡 Medium Issues: 0
⚪ Low Issues: 5

📈 Total Issues Found: 200

🔴 Orders: Orders without order_line_items - 100 found
Examples: Order ID: 1, Order ID: 2, Order ID: 3
... and 7 more

🟠 Invoices: Invoices without line items - 100 found
Examples: Invoice ID: 1, Invoice ID: 2, Invoice ID: 3
... and 7 more

============================================================
⚠️ Found 200 referential integrity issues
Run augmentation scripts to fix these issues.
============================================================
