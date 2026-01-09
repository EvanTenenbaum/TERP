/**
 * Caching Layer
 * ✅ ADDED: TERP-INIT-005 Phase 4 - Implement caching for frequently accessed data
 *
 * Provides in-memory caching with TTL (Time To Live) for non-volatile data
 * such as vendor lists, product categories, and other reference data.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheEntry<unknown>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) {
    // Default TTL: 5 minutes
    this.store = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached data by key
   * @param key - Cache key
   * @returns Cached data or null if expired/not found
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data with optional TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.store.set(key, { data, expiresAt });
  }

  /**
   * Delete cached data by key
   * @param key - Cache key
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Delete all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get or set cached data with a factory function
   * @param key - Cache key
   * @param factory - Function to generate data if not cached
   * @param ttl - Time to live in milliseconds (optional)
   * @returns Cached or newly generated data
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidate cache entries by pattern
   * @param pattern - Regex pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (pattern.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    expired: number;
  } {
    const now = Date.now();
    let expired = 0;

    const values = Array.from(this.store.values());
    for (const entry of values) {
      if (now > entry.expiresAt) {
        expired++;
      }
    }

    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
      expired,
    };
  }
}

// Singleton cache instance
const cache = new Cache();

// Auto-cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 600000);

export default cache;

/**
 * Cache key builders for common patterns
 */
export const CacheKeys = {
  // Deprecated - use suppliers instead
  vendors: () => "vendors:all",
  vendor: (id: number) => `vendor:${id}`,
  // Canonical supplier cache keys (replaces vendors)
  suppliers: () => "suppliers:all",
  supplier: (clientId: number) => `supplier:${clientId}`,
  supplierByLegacyVendor: (vendorId: number) => `supplier:legacy:${vendorId}`,
  // Other cache keys
  brands: (vendorId?: number) =>
    vendorId ? `brands:vendor:${vendorId}` : "brands:all",
  brand: (id: number) => `brand:${id}`,
  categories: () => "categories:all",
  subcategories: (category?: string) =>
    category ? `subcategories:${category}` : "subcategories:all",
  productsByBrand: (brandId: number) => `products:brand:${brandId}`,
  batchStats: () => "batches:stats",
  dashboardStats: () => "dashboard:stats",
  // Feature Flags cache keys
  featureFlags: {
    all: () => "featureFlags:all",
    byKey: (key: string) => `featureFlags:key:${key}`,
    userEffective: (userOpenId: string) => `featureFlags:user:${userOpenId}`,
    moduleFlags: (module: string) => `featureFlags:module:${module}`,
  },
  // Calendar Event Permissions cache keys
  calendarEventPermission: (userId: number, eventId: number, permission: string) =>
    `calendarEvent:${eventId}:user:${userId}:permission:${permission}`,
  calendarEventPermissionsForUser: (userId: number) =>
    `calendarEvent:user:${userId}:permissions`,
  calendarEventPermissionsForEvent: (eventId: number) =>
    `calendarEvent:${eventId}:permissions`,
};

/**
 * Cache TTL presets (in milliseconds)
 */
export const CacheTTL = {
  SHORT: 60000, // 1 minute
  MEDIUM: 300000, // 5 minutes
  LONG: 900000, // 15 minutes
  HOUR: 3600000, // 1 hour
  DAY: 86400000, // 24 hours
};
