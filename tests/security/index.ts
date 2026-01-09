/**
 * Security Test Suite Index
 *
 * Central export point for all security tests covering SEC-005 through SEC-010.
 * Import this file to run the complete security test suite.
 *
 * Test Coverage:
 * - Authentication bypass prevention (auth-bypass.test.ts)
 * - Permission escalation prevention (permission-escalation.test.ts)
 * - SQL injection prevention (sql-injection.test.ts)
 *
 * Security Issues Tested:
 * - SEC-005: Location Router authentication
 * - SEC-006: Warehouse Transfers authentication
 * - SEC-007: Order Enhancements authentication (11 endpoints)
 * - SEC-008: Settings Router authentication
 * - SEC-009: VIP Portal data exposure
 * - SEC-010: Returns and Refunds data protection
 *
 * @module tests/security/index
 */

export * from "./auth-bypass.test";
export * from "./permission-escalation.test";
export * from "./sql-injection.test";
