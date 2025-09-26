// Jest setup file for ERPv2 tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENABLE_RBAC = 'false';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/erpv2_test';

// Global test timeout
jest.setTimeout(30000);
