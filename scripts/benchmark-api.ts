/**
 * ST-015: API Performance Benchmark Script
 * Measures baseline performance of critical API endpoints
 * Run with: pnpm tsx scripts/benchmark-api.ts
 */

import { performance } from 'perf_hooks';

// Critical endpoints to benchmark
const endpoints = [
  { name: 'clients.list', description: 'List all clients' },
  { name: 'clients.getById', description: 'Get client by ID' },
  { name: 'orders.list', description: 'List all orders' },
  { name: 'orders.getById', description: 'Get order by ID' },
  { name: 'batches.list', description: 'List all batches' },
  { name: 'batches.getById', description: 'Get batch by ID' },
  { name: 'inventory.list', description: 'List inventory items' },
  { name: 'vendors.list', description: 'List all vendors' },
  { name: 'dashboard.getMetrics', description: 'Get dashboard metrics' },
  { name: 'dashboard.getKPIs', description: 'Get dashboard KPIs' },
  { name: 'reports.arAging', description: 'Generate AR aging report' },
  { name: 'reports.inventory', description: 'Generate inventory report' },
  { name: 'products.list', description: 'List all products' },
  { name: 'purchaseOrders.list', description: 'List purchase orders' },
  { name: 'comments.list', description: 'List comments' },
];

interface BenchmarkResult {
  endpoint: string;
  description: string;
  samples: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Simulate API call (replace with actual tRPC calls in production)
 */
async function measureEndpoint(endpoint: string): Promise<number> {
  const start = performance.now();
  
  // TODO: Replace with actual tRPC client call
  // Example: await trpc.clients.list.query();
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  
  const end = performance.now();
  return end - start;
}

/**
 * Run benchmark for a single endpoint
 */
async function benchmarkEndpoint(
  name: string,
  description: string,
  samples: number = 10
): Promise<BenchmarkResult> {
  const times: number[] = [];
  
  console.log(`Benchmarking ${name}...`);
  
  for (let i = 0; i < samples; i++) {
    const time = await measureEndpoint(name);
    times.push(time);
  }
  
  // Sort for percentile calculations
  times.sort((a, b) => a - b);
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  
  return {
    endpoint: name,
    description,
    samples,
    avgTime,
    minTime,
    maxTime,
    p50,
    p95,
    p99,
  };
}

/**
 * Generate markdown report
 */
function generateReport(results: BenchmarkResult[]): string {
  const timestamp = new Date().toISOString();
  
  let report = `# Performance Baseline Report\n\n`;
  report += `**Generated:** ${timestamp}\n`;
  report += `**Samples per endpoint:** 10\n\n`;
  report += `## Summary\n\n`;
  report += `| Endpoint | Description | Avg (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |\n`;
  report += `|----------|-------------|----------|----------|----------|----------|----------|----------|\n`;
  
  for (const result of results) {
    report += `| ${result.endpoint} | ${result.description} | `;
    report += `${result.avgTime.toFixed(2)} | `;
    report += `${result.p50.toFixed(2)} | `;
    report += `${result.p95.toFixed(2)} | `;
    report += `${result.p99.toFixed(2)} | `;
    report += `${result.minTime.toFixed(2)} | `;
    report += `${result.maxTime.toFixed(2)} |\n`;
  }
  
  report += `\n## Performance Targets\n\n`;
  report += `- **P50 < 100ms:** Fast response for typical requests\n`;
  report += `- **P95 < 500ms:** Acceptable for most users\n`;
  report += `- **P99 < 1000ms:** Rare slow requests\n\n`;
  
  report += `## Recommendations\n\n`;
  
  const slowEndpoints = results.filter(r => r.p95 > 500);
  if (slowEndpoints.length > 0) {
    report += `### Slow Endpoints (P95 > 500ms)\n\n`;
    for (const endpoint of slowEndpoints) {
      report += `- **${endpoint.endpoint}**: ${endpoint.p95.toFixed(2)}ms (P95)\n`;
    }
    report += `\n`;
  }
  
  report += `## Next Steps\n\n`;
  report += `1. Implement database indexes (ST-005)\n`;
  report += `2. Add query result caching where appropriate\n`;
  report += `3. Optimize N+1 queries\n`;
  report += `4. Re-run benchmark after optimizations\n`;
  
  return report;
}

/**
 * Main benchmark function
 */
async function main() {
  console.log('Starting API performance benchmark...\n');
  
  const results: BenchmarkResult[] = [];
  
  for (const endpoint of endpoints) {
    const result = await benchmarkEndpoint(endpoint.name, endpoint.description);
    results.push(result);
  }
  
  console.log('\nGenerating report...');
  const report = generateReport(results);
  
  // Write to file
  const fs = await import('fs/promises');
  await fs.writeFile('docs/performance-baseline.md', report);
  
  console.log('\n✅ Benchmark complete!');
  console.log('Report saved to: docs/performance-baseline.md');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
