import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { optimisticUpdate } from './optimisticLock';
import { sql } from 'drizzle-orm';

// Mock DB and table
const mockDb = {
  update: vi.fn(),
  select: vi.fn(),
};

const mockTable = {
  id: { name: 'id' },
  version: { name: 'version' },
};

describe('Optimistic Locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully update when versions match', async () => {
    // Setup mock for update (returning rowsAffected = 1)
    const mockUpdateResult = [{ affectedRows: 1 }];
    const updateChain = {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockUpdateResult),
      }),
    };
    mockDb.update.mockReturnValue(updateChain);

    const id = 1;
    const updates = { name: 'New Name' };
    const currentVersion = 1;

    const result = await optimisticUpdate(mockTable, id, updates, currentVersion, mockDb);

    expect(mockDb.update).toHaveBeenCalledWith(mockTable);
    expect(updateChain.set).toHaveBeenCalledWith({
      ...updates,
      version: sql`${mockTable.version} + 1`,
    });
    expect(result).toBe(mockUpdateResult);
  });

  it('should throw error when concurrent modification detected (version mismatch)', async () => {
    // Setup mock for update (returning rowsAffected = 0)
    const mockUpdateResult = [{ affectedRows: 0 }];
    const updateChain = {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockUpdateResult),
      }),
    };
    mockDb.update.mockReturnValue(updateChain);

    // Setup mock for select (finding the record exists)
    const selectChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            then: vi.fn().mockImplementation((callback) => callback([{ id: 1, version: 2 }])),
          }),
        }),
      }),
    };
    mockDb.select.mockReturnValue(selectChain);

    const id = 1;
    const updates = { name: 'New Name' };
    const currentVersion = 1;

    await expect(
      optimisticUpdate(mockTable, id, updates, currentVersion, mockDb)
    ).rejects.toThrow('Concurrent modification detected');
  });

  it('should throw error when record not found', async () => {
    // Setup mock for update (returning rowsAffected = 0)
    const mockUpdateResult = [{ affectedRows: 0 }];
    const updateChain = {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockUpdateResult),
      }),
    };
    mockDb.update.mockReturnValue(updateChain);

    // Setup mock for select (returning no record)
    const selectChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            then: vi.fn().mockImplementation((callback) => callback([])),
          }),
        }),
      }),
    };
    mockDb.select.mockReturnValue(selectChain);

    const id = 1;
    const updates = { name: 'New Name' };
    const currentVersion = 1;

    await expect(
      optimisticUpdate(mockTable, id, updates, currentVersion, mockDb)
    ).rejects.toThrow(`Record ${id} not found`);
  });
});
