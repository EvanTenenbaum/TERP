/**
 * Test Database Utility
 * 
 * Provides a properly mocked database for testing that matches the real db interface.
 * This utility solves the "db is not defined" errors in tests.
 */

import { vi } from 'vitest';

/**
 * Create a mock database object that matches the Drizzle ORM interface
 */
export function createMockDb() {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {},
    transaction: vi.fn(),
    $with: vi.fn(),
  };

  // Setup chainable query builder pattern
  const setupChainableMock = () => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    then: vi.fn((resolve) => resolve([])), // Make it thenable
  });

  // Make select() return a chainable mock
  mockDb.select.mockReturnValue(setupChainableMock());

  // Make insert() return a chainable mock
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue([]),
        then: vi.fn((resolve) => resolve([])),
      }),
      execute: vi.fn().mockResolvedValue({ insertId: 1, changes: 1 }),
      then: vi.fn((resolve) => resolve({ insertId: 1, changes: 1 })),
    }),
  });

  // Make update() return a chainable mock
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
          then: vi.fn((resolve) => resolve([])),
        }),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        then: vi.fn((resolve) => resolve({ changes: 1 })),
      }),
    }),
  });

  // Make delete() return a chainable mock
  mockDb.delete.mockReturnValue({
    where: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({ changes: 1 }),
      then: vi.fn((resolve) => resolve({ changes: 1 })),
    }),
  });

  return mockDb;
}

/**
 * Setup database mock for a test file
 * 
 * Usage in test files:
 * ```ts
 * import { setupDbMock } from '../test-utils/testDb';
 * 
 * vi.mock('../db', () => setupDbMock());
 * ```
 */
export function setupDbMock() {
  const mockDb = createMockDb();
  
  return {
    db: mockDb,
    getDb: vi.fn().mockReturnValue(mockDb),
  };
}

/**
 * Create a mock query result
 * 
 * Usage:
 * ```ts
 * const mockDb = createMockDb();
 * mockDb.select().from().where().mockResolvedValue(createMockResult([{ id: 1, name: 'Test' }]));
 * ```
 */
export function createMockResult<T>(data: T[]): T[] {
  return data;
}

/**
 * Helper to setup a mock select query with specific results
 */
export function mockSelectQuery(mockDb: ReturnType<typeof createMockDb>, results: unknown[]) {
  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(results),
    then: vi.fn((resolve) => resolve(results)),
  };

  mockDb.select.mockReturnValue(chainable);
  return chainable;
}

/**
 * Helper to setup a mock insert query
 */
export function mockInsertQuery(mockDb: ReturnType<typeof createMockDb>, result: unknown) {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue([result]),
        then: vi.fn((resolve) => resolve([result])),
      }),
      execute: vi.fn().mockResolvedValue({ insertId: 1, changes: 1 }),
      then: vi.fn((resolve) => resolve({ insertId: 1, changes: 1 })),
    }),
  });
}

/**
 * Helper to setup a mock update query
 */
export function mockUpdateQuery(mockDb: ReturnType<typeof createMockDb>, result: unknown) {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([result]),
          then: vi.fn((resolve) => resolve([result])),
        }),
        execute: vi.fn().mockResolvedValue({ changes: 1 }),
        then: vi.fn((resolve) => resolve({ changes: 1 })),
      }),
    }),
  });
}

/**
 * Helper to setup a mock delete query
 */
export function mockDeleteQuery(mockDb: ReturnType<typeof createMockDb>) {
  mockDb.delete.mockReturnValue({
    where: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({ changes: 1 }),
      then: vi.fn((resolve) => resolve({ changes: 1 })),
    }),
  });
}
