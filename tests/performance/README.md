# Performance Tests

Performance benchmarks for TERP API endpoints and critical operations.

## Overview

These tests measure response times and ensure endpoints meet performance targets. They use mocked database responses to isolate the performance of the application layer.

## Performance Targets

| Operation Type   | Target (95th percentile) |
| ---------------- | ------------------------ |
| Read operations  | < 500ms                  |
| Write operations | < 1000ms                 |
| Health checks    | < 100ms                  |
| Batch operations | < 2000ms                 |

## Running Performance Tests

```bash
# Run all performance tests
pnpm test -- tests/performance/

# Run with verbose output
pnpm test -- tests/performance/ --reporter=verbose

# Run specific benchmark
pnpm test -- tests/performance/api-benchmarks.test.ts
```

## Benchmarks

| Endpoint                 | Target  | Description                            |
| ------------------------ | ------- | -------------------------------------- |
| inventory.list           | <500ms  | List inventory batches with pagination |
| inventory.dashboardStats | <500ms  | Dashboard statistics aggregation       |
| clients.list             | <500ms  | List clients with filters              |
| clients.count            | <500ms  | Client count query                     |
| clients.create           | <1000ms | Create new client record               |
| clients.update           | <1000ms | Update client record                   |
| clients.delete           | <1000ms | Soft delete client                     |

## What These Tests Measure

1. **Response Time**: Time from request to response for each endpoint
2. **Memory Efficiency**: Memory growth when processing large datasets
3. **Batch Performance**: Sequential operation throughput
4. **Regression Prevention**: Automated checks against performance baselines

## Adding New Benchmarks

1. Add test to `api-benchmarks.test.ts`
2. Set appropriate target time based on operation type
3. Mock database responses to ensure consistent measurements
4. Run tests multiple times to verify stability
5. Update this README with new benchmark entries

## Interpreting Results

- **Pass**: Operation completed within target time
- **Fail**: Performance regression detected - investigate before merging
- **Flaky**: If results are inconsistent, the target may need adjustment

## Performance Regression Workflow

1. All performance tests run in CI pipeline
2. Failed benchmarks block merge to main branch
3. When adding new features, run performance tests locally first
4. Document any target adjustments with justification

## Notes

- Tests use mocked database responses to isolate application layer performance
- Real-world performance may vary based on database load and network latency
- For production performance monitoring, see the monitoring dashboard
- Memory benchmarks account for test environment overhead

## Troubleshooting

**Tests are flaky**: Increase target slightly or add warm-up runs
**Tests timing out**: Check for unresolved async operations
**Memory tests failing**: May indicate memory leaks - profile with Node inspector
