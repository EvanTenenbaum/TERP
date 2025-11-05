import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../_core/app';
import { createTRPCContext } from '../_core/trpc';
import { db } from '../../scripts/db-sync';
import { orders, clients } from '../../drizzle/schema';

describe('Orders Router - Integration Tests', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const ctx = await createTRPCContext({} as any);
    caller = appRouter.createCaller(ctx);
  });

  it('should create a new order and retrieve it', async () => {
    // Arrange: Get a client to associate the order with
    const testClient = await db.select().from(clients).limit(1);
    const clientId = testClient[0].id;

    const newOrderInput = {
      clientId: clientId,
      orderDate: new Date(),
      total: '1500.00',
      status: 'PENDING' as const,
      items: [
        {
          productId: 1,
          quantity: 10,
          unitPrice: '150.00',
        },
      ],
    };

    // Act: Create the order
    const createdOrder = await caller.orders.create(newOrderInput);

    // Assert: Check that the order was created with the correct data
    expect(createdOrder).toBeDefined();
    expect(createdOrder.id).toBeTypeOf('number');
    expect(createdOrder.total).toBe('1500.00');

    // Act: Retrieve the order directly from the database
    const dbOrder = await db.select().from(orders).where({ id: createdOrder.id });

    // Assert: Verify the data in the database
    expect(dbOrder).toHaveLength(1);
    expect(dbOrder[0].clientId).toBe(clientId);
    expect(dbOrder[0].total).toBe('1500.00');
  });

  it('should list all orders', async () => {
    // Act: List all orders
    const allOrders = await caller.orders.list();

    // Assert: Check that the list is not empty
    expect(allOrders.length).toBeGreaterThan(0);
  });
});
