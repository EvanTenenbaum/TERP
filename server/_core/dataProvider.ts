/**
 * Data Provider Abstraction Layer
 *
 * Provides a consistent interface for data access regardless of the underlying
 * implementation (direct DB, Redis cache, offline store, etc.). This enables:
 * - Easy addition of caching layers (Redis, in-memory)
 * - Offline-first capabilities
 * - Better testability (mock the provider)
 * - Consistent data access patterns
 * - Future migration to different databases
 *
 * @module server/_core/dataProvider
 */

import type { User } from "../../drizzle/schema";
import * as db from "../db";

/**
 * Data provider interface
 *
 * Any data access implementation must conform to this interface
 */
export interface DataProvider {
  /**
   * Get a user by their ID
   *
   * @param userId - User's openId
   * @returns User object or null if not found
   */
  getUser(userId: string): Promise<User | null>;

  /**
   * Get a user by their email address
   *
   * @param email - User's email
   * @returns User object or null if not found
   */
  getUserByEmail(email: string): Promise<User | null>;

  /**
   * Get the name of the current data provider
   *
   * @returns Provider name (e.g., 'drizzle', 'redis', 'offline')
   */
  getProvider(): string;
}

/**
 * Drizzle implementation of DataProvider
 *
 * Direct access to the database using Drizzle ORM
 */
class DrizzleDataProvider implements DataProvider {
  async getUser(userId: string): Promise<User | null> {
    const user = await db.getUser(userId);
    return user ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await db.getUserByEmail(email);
    return user ?? null;
  }

  getProvider(): string {
    return "drizzle";
  }
}

/**
 * Default data provider instance
 *
 * Currently uses Drizzle directly, but can be swapped to add caching,
 * offline support, or other data access patterns.
 *
 * Future implementations could include:
 * - CachedDataProvider (Redis + Drizzle)
 * - OfflineDataProvider (IndexedDB + sync)
 * - ReadReplicaDataProvider (read from replica, write to primary)
 */
export const dataProvider: DataProvider = new DrizzleDataProvider();

/**
 * Create a custom data provider
 *
 * Use this for testing or to swap providers at runtime
 *
 * @param provider - Custom data provider implementation
 * @returns Data provider instance
 */
export function createDataProvider(provider: DataProvider): DataProvider {
  return provider;
}

/**
 * Example: Cached Data Provider (future implementation)
 *
 * This shows how to add a caching layer:
 *
 * ```typescript
 * class CachedDataProvider implements DataProvider {
 *   constructor(
 *     private cache: RedisClient,
 *     private fallback: DataProvider
 *   ) {}
 *
 *   async getUser(userId: string): Promise<User | null> {
 *     // Try cache first
 *     const cached = await this.cache.get(`user:${userId}`);
 *     if (cached) return JSON.parse(cached);
 *
 *     // Fall back to database
 *     const user = await this.fallback.getUser(userId);
 *     if (user) {
 *       await this.cache.set(`user:${userId}`, JSON.stringify(user), 'EX', 300);
 *     }
 *     return user;
 *   }
 *
 *   // ... other methods
 * }
 *
 * // Usage:
 * export const dataProvider = new CachedDataProvider(redisClient, new DrizzleDataProvider());
 * ```
 */
