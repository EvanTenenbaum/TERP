# ADR-0002: tRPC Over REST API

**Status:** Accepted
**Date:** 2025-12-01
**Author:** Original Architecture
**Deciders:** Project Foundation

## Context

TERP needed an API layer to connect the React frontend with the Node.js/Express backend. The two main options considered were:

1. Traditional REST API with OpenAPI specification
2. tRPC for end-to-end type safety

The application is a monorepo with both client and server in the same repository, making shared types practical.

## Decision

We use **tRPC** as the primary API layer for all client-server communication.

Key implementation details:
- tRPC v11 with Express adapter
- HTTP batch link for request batching
- React Query integration via `@trpc/react-query`
- Zod for input validation (shared with tRPC)

## Consequences

### Positive

- **End-to-end type safety**: Changes to API contracts are caught at compile time
- **No code generation**: Types are inferred, not generated from OpenAPI specs
- **Excellent DX**: Autocomplete for API calls in frontend code
- **Reduced boilerplate**: No need for fetch wrappers, type definitions, or API clients
- **Validation built-in**: Zod schemas serve as both validation and types
- **React Query integration**: Automatic caching, refetching, optimistic updates

### Negative

- **Not RESTful**: Cannot easily expose API to external consumers
- **Learning curve**: Developers unfamiliar with tRPC need onboarding
- **Tight coupling**: Frontend and backend must share types (acceptable in monorepo)
- **Limited tooling**: No Swagger/OpenAPI documentation generation
- **Breaking changes harder to version**: No URL-based API versioning

### Neutral

- Authentication still handled via Express middleware (JWT in cookies)
- File uploads use separate Express routes (tRPC has limitations here)

## Alternatives Considered

### Alternative 1: REST API with OpenAPI

Traditional REST endpoints with OpenAPI specification for documentation and type generation.

**Rejected because:**
- Requires maintaining OpenAPI spec separately from code
- Type generation adds build step complexity
- More boilerplate for each endpoint
- No compile-time safety for API changes

### Alternative 2: GraphQL

GraphQL with code-first schema generation.

**Rejected because:**
- Higher complexity for the team size
- Over-fetching/under-fetching not a significant problem for this app
- N+1 query prevention requires careful resolver design
- tRPC provides similar benefits with less complexity

## Implementation Notes

### Router Structure

```typescript
// server/routers/orders.ts
export const ordersRouter = router({
  list: protectedProcedure
    .use(requirePermission('orders:read'))
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      return await ordersDb.getOrders(input);
    }),

  create: protectedProcedure
    .use(requirePermission('orders:create'))
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      return await ordersDb.createOrder(input, ctx.user.id);
    }),
});
```

### Client Usage

```typescript
// Automatic type inference
const { data, isLoading } = trpc.orders.list.useQuery({ limit: 10 });
// data is fully typed as Order[]

const createOrder = trpc.orders.create.useMutation();
// createOrder.mutate() has typed input
```

## References

- tRPC Documentation: https://trpc.io/docs
- Main router: `server/_core/trpc.ts`
- Client setup: `client/src/lib/trpc.ts`
