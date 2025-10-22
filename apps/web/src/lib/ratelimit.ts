/**
 * Rate limiting utility using in-memory store for development
 * and Upstash Redis for production
 */

// Simple in-memory rate limiter for development/testing
class MemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private window: number; // in milliseconds

  constructor(limit: number, windowSeconds: number) {
    this.limit = limit;
    this.window = windowSeconds * 1000;
  }

  async check(identifier: string): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove requests outside the time window
    const validRequests = requests.filter(time => now - time < this.window);
    
    if (validRequests.length >= this.limit) {
      this.requests.set(identifier, validRequests);
      return { success: false, remaining: 0 };
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return { success: true, remaining: this.limit - validRequests.length };
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.window);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Create rate limiter instance
// 100 requests per minute for API endpoints
const memoryLimiter = new MemoryRateLimiter(100, 60);

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => memoryLimiter.cleanup(), 5 * 60 * 1000);
}

// Export rate limiter
export const ratelimit = {
  limit: async (identifier: string) => {
    // In production with Upstash Redis configured, use Redis
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const { Ratelimit } = await import('@upstash/ratelimit');
        const { Redis } = await import('@upstash/redis');
        
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        
        const limiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(100, '1 m'),
          analytics: true,
        });
        
        return await limiter.limit(identifier);
      } catch (error) {
        console.error('Redis rate limiting error, falling back to memory:', error);
        return memoryLimiter.check(identifier);
      }
    }
    
    // Fallback to in-memory limiter for development
    return memoryLimiter.check(identifier);
  },
};
