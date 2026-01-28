// Re-export db utilities for router compatibility
export { getDb, upsertUser, getUser, getUserByEmail, getUserById } from '../db';

// For convenience, also export a promise-based db getter
import { getDb as getDatabase } from '../db';

let _cachedDb: Awaited<ReturnType<typeof getDatabase>> | null = null;

export async function getDbInstance() {
  if (!_cachedDb) {
    _cachedDb = await getDatabase();
  }
  return _cachedDb;
}

// For query builder pattern used in VIP portal
export const dbQueryBuilder = {
  query: {} as any,
  select: () => ({} as any),
  insert: () => ({} as any),
  update: () => ({} as any),
  delete: () => ({} as any),
  execute: () => ({} as any),
};
