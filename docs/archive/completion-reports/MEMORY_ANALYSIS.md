# TERP Memory Analysis & Optimization Recommendations

**Date:** January 5, 2026
**Issue:** Production server at 96.7% memory usage

---

## Root Cause Analysis

### 1. Infrastructure Constraint (PRIMARY CAUSE)

**Current Configuration:**

- Instance Size: `basic-xs` (512MB RAM, 1 vCPU)
- Node.js Max Heap: `--max-old-space-size=896` (896MB - exceeds available RAM!)
- Actual Available Memory: ~110MB heap total (from health check)

**Problem:** The Dockerfile sets `--max-old-space-size=896` but the `basic-xs` instance only has 512MB total RAM. This mismatch causes Node.js to attempt to use more memory than available, leading to constant memory pressure.

### 2. Memory Stats Breakdown

From health check:

```json
{
  "used": 112493008, // ~107MB heap used
  "total": 119078912, // ~113MB heap total
  "percentage": 94.47,
  "rss": 277450752, // ~265MB RSS (total process memory)
  "external": 4416936 // ~4MB external
}
```

The RSS (Resident Set Size) of 265MB is reasonable for a Node.js application, but the heap is constrained to ~113MB due to the small instance size.

### 3. Memory Optimizer Hardcoded Value

In `server/utils/memoryOptimizer.ts`:

```typescript
const totalMemory =
  process.env.NODE_ENV === "production" ? 102682624 : memUsage.heapTotal;
```

This hardcodes ~98MB as the "total memory" for production, which is even smaller than what's actually available.

---

## Recommended Fixes

### Option A: Upgrade Instance Size (RECOMMENDED)

**Change in `.do/app.yaml`:**

```yaml
# Current
instance_size_slug: basic-xs   # 512MB RAM

# Recommended
instance_size_slug: basic-s    # 1GB RAM ($12/month)
# OR
instance_size_slug: basic-m    # 2GB RAM ($24/month)
```

**Cost Impact:**

- basic-xs: $5/month
- basic-s: $12/month (+$7)
- basic-m: $24/month (+$19)

### Option B: Optimize Node.js Memory Settings

**Change in `Dockerfile`:**

```dockerfile
# Current (too high for basic-xs)
CMD ["node", "--max-old-space-size=896", "dist/index.js"]

# Fixed for basic-xs (512MB instance)
CMD ["node", "--max-old-space-size=384", "dist/index.js"]
```

This limits Node.js to 384MB heap, leaving room for OS and other processes.

### Option C: Fix Memory Optimizer Hardcoded Value

**Change in `server/utils/memoryOptimizer.ts`:**

```typescript
// Current (hardcoded, incorrect)
const totalMemory =
  process.env.NODE_ENV === "production" ? 102682624 : memUsage.heapTotal;

// Fixed (use environment variable or actual heap)
const totalMemory = process.env.NODE_MEMORY_LIMIT
  ? parseInt(process.env.NODE_MEMORY_LIMIT, 10)
  : memUsage.heapTotal;
```

---

## Additional Optimizations

### 1. Add Memory Limit Environment Variable

In `.do/app.yaml`:

```yaml
envs:
  - key: NODE_MEMORY_LIMIT
    value: "384000000" # 384MB for basic-xs
```

### 2. Improve Cache Cleanup Frequency

In `server/_core/cache.ts`:

```typescript
// Current: cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 600000);

// Recommended: cleanup every 2 minutes for memory-constrained environments
setInterval(() => {
  cache.cleanup();
}, 120000);
```

### 3. Add Streaming for Large Queries

For queries that return large datasets, consider implementing pagination or streaming:

```typescript
// Instead of loading all at once
const allItems = await db.query.items.findMany();

// Use pagination
const items = await db.query.items.findMany({
  limit: 100,
  offset: page * 100,
});
```

---

## Immediate Action Plan

1. **Quick Fix (No Cost):** Update Dockerfile to use `--max-old-space-size=384`
2. **Medium-term (Recommended):** Upgrade to `basic-s` instance ($7/month increase)
3. **Long-term:** Implement proper memory monitoring and alerting

---

## Monitoring Recommendations

1. Set up alerts for memory usage > 80%
2. Add memory metrics to application logs
3. Consider adding a `/metrics` endpoint for Prometheus/Grafana integration

---

## Conclusion

The primary issue is **infrastructure undersizing** - the `basic-xs` instance (512MB) is too small for a full-stack Node.js application with React frontend, tRPC backend, and database connections.

**Recommended Solution:** Upgrade to `basic-s` (1GB RAM) for $7/month more, which will provide adequate headroom for the application.
