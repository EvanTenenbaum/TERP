# Implementation Plan

## Low-Hanging Fruit Cleanup Tasks

- [x] 1. Fix Connection Pool Memory Leak and Configuration (REL-003 + REL-004)
  - [x] 1.1 Add module-level statsInterval variable to store the interval reference
    - Add `let statsInterval: NodeJS.Timeout | null = null;` at module level
    - Store the setInterval return value in this variable
    - _Requirements: 1.1_
  - [x] 1.2 Update closeConnectionPool() to clear the interval
    - Add interval clearing logic before pool.end()
    - Set statsInterval to null after clearing
    - _Requirements: 1.2, 1.3_
  - [x] 1.3 Update default pool configuration values
    - Change connectionLimit from 10 to 25
    - Change queueLimit from 0 to 100
    - _Requirements: 2.1, 2.2_

- [x] 2. Fix Backup Script Password Security (IMPROVE-001)
  - [x] 2.1 Replace command-line password with environment variable
    - Remove --password="${DB_PASSWORD}" from mysqldump command
    - Add `export MYSQL_PWD="${DB_PASSWORD}"` before mysqldump
    - Add `unset MYSQL_PWD` after mysqldump completes
    - Capture exit code before unsetting password
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Replace console.error with structured logger in clientNeedsDbEnhanced.ts (QUAL-001-A)
  - [x] 3.1 Add logger import and replace all console.error calls
    - Add import { logger } from "./_core/logger";
    - Replace ~14 console.error calls with logger.error() structured format
    - _Requirements: 4.1, 4.2_

- [x] 4. Replace console.error with structured logger in recurringOrdersDb.ts (QUAL-001-B)
  - [x] 4.1 Add logger import and replace all console.error calls
    - Add import { logger } from "./_core/logger";
    - Replace ~11 console.error calls with logger.error() structured format
    - _Requirements: 5.1, 5.2_

- [x] 5. Replace console.error with structured logger in matchingEngineEnhanced.ts (QUAL-001-C)
  - [x] 5.1 Add logger import and replace all console.error calls
    - Add import { logger } from "./_core/logger";
    - Replace ~6 console.error calls with logger.error() structured format
    - _Requirements: 6.1, 6.2_

- [x] 6. Final Validation Checkpoint
  - Ensure all tests pass, run pnpm typecheck and pnpm lint
  - Verify no console.error remains in updated files
  - Commit all changes with appropriate messages
