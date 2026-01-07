# Wave 6: VIP Portal & Notifications

**Agent Role**: Full Stack Developer  
**Duration**: 10-12 hours  
**Priority**: P2  
**Dependencies**: Waves 4-5 complete  
**Can Run Parallel With**: Wave 7 (different domains)

---

## Overview

Complete the VIP Portal for client self-service and implement the notification system for real-time updates.

---

## Part A: VIP Portal (6-7 hours)

### Task 1: VIP Authentication (1.5 hours)

```typescript
// server/routers/vipAuth.ts

import { z } from 'zod';
import { router, publicProcedure, vipProtectedProcedure } from '../_core/trpc';
import { vipUsers, clients, vipSessions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { hashPassword, verifyPassword, generateToken } from '../lib/auth';
import { logger } from '../lib/logger';

export const vipAuthRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      logger.info('[VIP Auth] Login attempt', { email: input.email });

      const vipUser = await db.query.vipUsers.findFirst({
        where: eq(vipUsers.email, input.email.toLowerCase()),
        with: { client: true },
      });

      if (!vipUser) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }

      if (!vipUser.isActive) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Account is inactive' });
      }

      const isValid = await verifyPassword(input.password, vipUser.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }

      // Create session
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.insert(vipSessions).values({
        vipUserId: vipUser.id,
        token,
        expiresAt,
        createdAt: new Date(),
      });

      // Update last login
      await db.update(vipUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(vipUsers.id, vipUser.id));

      logger.info('[VIP Auth] Login successful', { vipUserId: vipUser.id });

      return {
        token,
        user: {
          id: vipUser.id,
          email: vipUser.email,
          name: vipUser.name,
          clientId: vipUser.clientId,
          clientName: vipUser.client.name,
        },
      };
    }),

  logout: vipProtectedProcedure
    .mutation(async ({ ctx }) => {
      await db.delete(vipSessions)
        .where(eq(vipSessions.token, ctx.vipToken));

      logger.info('[VIP Auth] Logout', { vipUserId: ctx.vipUser.id });

      return { success: true };
    }),

  me: vipProtectedProcedure
    .query(async ({ ctx }) => {
      return {
        id: ctx.vipUser.id,
        email: ctx.vipUser.email,
        name: ctx.vipUser.name,
        clientId: ctx.vipUser.clientId,
        clientName: ctx.vipUser.client.name,
      };
    }),

  changePassword: vipProtectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      const isValid = await verifyPassword(input.currentPassword, ctx.vipUser.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Current password is incorrect' });
      }

      const newHash = await hashPassword(input.newPassword);

      await db.update(vipUsers)
        .set({
          passwordHash: newHash,
          updatedAt: new Date(),
        })
        .where(eq(vipUsers.id, ctx.vipUser.id));

      logger.info('[VIP Auth] Password changed', { vipUserId: ctx.vipUser.id });

      return { success: true };
    }),
});
```

### Task 2: VIP Catalog Browsing (1.5 hours)

```typescript
// server/routers/vipCatalog.ts

import { z } from 'zod';
import { router, vipProtectedProcedure } from '../_core/trpc';
import { catalogItems, clientPricing } from '../db/schema';
import { eq, and, gt, ilike, or } from 'drizzle-orm';
import { logger } from '../lib/logger';

export const vipCatalogRouter = router({
  browse: vipProtectedProcedure
    .input(z.object({
      category: z.string().optional(),
      subcategory: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(catalogItems.isActive, true),
        gt(catalogItems.availableQuantity, 0),
      ];

      if (input.category) {
        conditions.push(eq(catalogItems.category, input.category));
      }
      if (input.subcategory) {
        conditions.push(eq(catalogItems.subcategory, input.subcategory));
      }
      if (input.search) {
        conditions.push(or(
          ilike(catalogItems.name, `%${input.search}%`),
          ilike(catalogItems.strain, `%${input.search}%`),
        ));
      }

      const items = await db.query.catalogItems.findMany({
        where: and(...conditions),
        with: {
          batch: {
            with: {
              photos: true,
              product: true,
            },
          },
        },
        limit: input.limit,
        offset: input.offset,
      });

      // Get client-specific pricing
      const itemsWithPricing = await Promise.all(
        items.map(async (item) => {
          const pricing = await getClientPrice(ctx.vipUser.clientId, item.batchId);
          return {
            ...item,
            price: pricing.price,
            originalPrice: pricing.originalPrice,
            hasDiscount: pricing.hasDiscount,
          };
        })
      );

      return itemsWithPricing;
    }),

  getCategories: vipProtectedProcedure
    .query(async () => {
      const categories = await db.selectDistinct({
        category: catalogItems.category,
      })
        .from(catalogItems)
        .where(eq(catalogItems.isActive, true));

      return categories.map(c => c.category).filter(Boolean);
    }),

  getItemDetail: vipProtectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await db.query.catalogItems.findFirst({
        where: and(
          eq(catalogItems.id, input.id),
          eq(catalogItems.isActive, true),
        ),
        with: {
          batch: {
            with: {
              photos: true,
              product: true,
              vendor: true,
            },
          },
        },
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }

      const pricing = await getClientPrice(ctx.vipUser.clientId, item.batchId);

      return {
        ...item,
        price: pricing.price,
        originalPrice: pricing.originalPrice,
        hasDiscount: pricing.hasDiscount,
      };
    }),
});

async function getClientPrice(clientId: number, batchId: number) {
  // Get client-specific pricing if exists
  const clientPrice = await db.query.clientPricing.findFirst({
    where: and(
      eq(clientPricing.clientId, clientId),
      eq(clientPricing.batchId, batchId),
    ),
  });

  const batch = await db.query.batches.findFirst({
    where: eq(batches.id, batchId),
  });

  const basePrice = batch?.retailPrice || 0;
  const price = clientPrice?.price || basePrice;

  return {
    price,
    originalPrice: basePrice,
    hasDiscount: price < basePrice,
  };
}
```

### Task 3: VIP Cart & Ordering (2 hours)

```typescript
// server/routers/vipCart.ts

import { z } from 'zod';
import { router, vipProtectedProcedure } from '../_core/trpc';
import { vipCarts, vipCartItems, catalogItems, orders, orderItems } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';

export const vipCartRouter = router({
  get: vipProtectedProcedure
    .query(async ({ ctx }) => {
      let cart = await db.query.vipCarts.findFirst({
        where: eq(vipCarts.vipUserId, ctx.vipUser.id),
        with: {
          items: {
            with: {
              catalogItem: {
                with: {
                  batch: { with: { photos: true } },
                },
              },
            },
          },
        },
      });

      if (!cart) {
        // Create cart if doesn't exist
        const [newCart] = await db.insert(vipCarts).values({
          vipUserId: ctx.vipUser.id,
          clientId: ctx.vipUser.clientId,
          createdAt: new Date(),
        }).returning();
        
        cart = { ...newCart, items: [] };
      }

      // Calculate totals with client pricing
      let subtotal = 0;
      const itemsWithPricing = await Promise.all(
        cart.items.map(async (item) => {
          const pricing = await getClientPrice(ctx.vipUser.clientId, item.catalogItem.batchId);
          const lineTotal = item.quantity * pricing.price;
          subtotal += lineTotal;
          return {
            ...item,
            unitPrice: pricing.price,
            lineTotal,
          };
        })
      );

      return {
        ...cart,
        items: itemsWithPricing,
        subtotal,
        total: subtotal,
      };
    }),

  addItem: vipProtectedProcedure
    .input(z.object({
      catalogItemId: z.number(),
      quantity: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate catalog item
      const catalogItem = await db.query.catalogItems.findFirst({
        where: and(
          eq(catalogItems.id, input.catalogItemId),
          eq(catalogItems.isActive, true),
        ),
      });

      if (!catalogItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }

      if (input.quantity > catalogItem.availableQuantity) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient quantity available' });
      }

      // Get or create cart
      let cart = await db.query.vipCarts.findFirst({
        where: eq(vipCarts.vipUserId, ctx.vipUser.id),
      });

      if (!cart) {
        const [newCart] = await db.insert(vipCarts).values({
          vipUserId: ctx.vipUser.id,
          clientId: ctx.vipUser.clientId,
          createdAt: new Date(),
        }).returning();
        cart = newCart;
      }

      // Check if item already in cart
      const existingItem = await db.query.vipCartItems.findFirst({
        where: and(
          eq(vipCartItems.cartId, cart.id),
          eq(vipCartItems.catalogItemId, input.catalogItemId),
        ),
      });

      if (existingItem) {
        // Update quantity
        const newQty = existingItem.quantity + input.quantity;
        if (newQty > catalogItem.availableQuantity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient quantity available' });
        }

        await db.update(vipCartItems)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(vipCartItems.id, existingItem.id));
      } else {
        // Add new item
        await db.insert(vipCartItems).values({
          cartId: cart.id,
          catalogItemId: input.catalogItemId,
          quantity: input.quantity,
          createdAt: new Date(),
        });
      }

      logger.info('[VIP Cart] Item added', { 
        vipUserId: ctx.vipUser.id, 
        catalogItemId: input.catalogItemId, 
        quantity: input.quantity 
      });

      return { success: true };
    }),

  updateQuantity: vipProtectedProcedure
    .input(z.object({
      cartItemId: z.number(),
      quantity: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const cartItem = await db.query.vipCartItems.findFirst({
        where: eq(vipCartItems.id, input.cartItemId),
        with: { cart: true, catalogItem: true },
      });

      if (!cartItem || cartItem.cart.vipUserId !== ctx.vipUser.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Cart item not found' });
      }

      if (input.quantity === 0) {
        await db.delete(vipCartItems).where(eq(vipCartItems.id, input.cartItemId));
      } else {
        if (input.quantity > cartItem.catalogItem.availableQuantity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient quantity available' });
        }
        await db.update(vipCartItems)
          .set({ quantity: input.quantity, updatedAt: new Date() })
          .where(eq(vipCartItems.id, input.cartItemId));
      }

      return { success: true };
    }),

  checkout: vipProtectedProcedure
    .input(z.object({
      notes: z.string().optional(),
      deliveryDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[VIP Cart] Checkout started', { vipUserId: ctx.vipUser.id });

      const cart = await db.query.vipCarts.findFirst({
        where: eq(vipCarts.vipUserId, ctx.vipUser.id),
        with: {
          items: {
            with: {
              catalogItem: { with: { batch: true } },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cart is empty' });
      }

      // Validate availability
      for (const item of cart.items) {
        if (item.quantity > item.catalogItem.availableQuantity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `${item.catalogItem.name} has insufficient quantity`,
          });
        }
      }

      // Calculate totals
      let subtotal = 0;
      const orderItemsData = await Promise.all(
        cart.items.map(async (item) => {
          const pricing = await getClientPrice(ctx.vipUser.clientId, item.catalogItem.batchId);
          const lineTotal = item.quantity * pricing.price;
          subtotal += lineTotal;
          return {
            batchId: item.catalogItem.batchId,
            quantity: item.quantity,
            unitPrice: pricing.price,
            total: lineTotal,
          };
        })
      );

      // Create order
      const orderNumber = await generateOrderNumber();
      const [order] = await db.insert(orders).values({
        orderNumber,
        clientId: ctx.vipUser.clientId,
        status: 'pending',
        source: 'vip_portal',
        subtotal,
        total: subtotal,
        notes: input.notes,
        requestedDeliveryDate: input.deliveryDate,
        createdAt: new Date(),
      }).returning();

      // Create order items
      await db.insert(orderItems).values(
        orderItemsData.map(item => ({
          orderId: order.id,
          ...item,
        }))
      );

      // Reserve inventory
      for (const item of orderItemsData) {
        await db.update(batches)
          .set({ reservedQuantity: sql`reserved_quantity + ${item.quantity}` })
          .where(eq(batches.id, item.batchId));
      }

      // Clear cart
      await db.delete(vipCartItems).where(eq(vipCartItems.cartId, cart.id));

      logger.info('[VIP Cart] Order created', { orderId: order.id, orderNumber });

      return order;
    }),
});
```

### Task 4: VIP Account Dashboard (1 hour)

```typescript
// server/routers/vipAccount.ts

export const vipAccountRouter = router({
  getDashboard: vipProtectedProcedure
    .query(async ({ ctx }) => {
      const clientId = ctx.vipUser.clientId;

      // Get recent orders
      const recentOrders = await db.query.orders.findMany({
        where: eq(orders.clientId, clientId),
        orderBy: desc(orders.createdAt),
        limit: 5,
      });

      // Get open invoices
      const openInvoices = await db.query.invoices.findMany({
        where: and(
          eq(invoices.clientId, clientId),
          gt(invoices.amountDue, 0),
        ),
        orderBy: invoices.dueDate,
      });

      // Get available credits
      const credits = await db.query.credits.findMany({
        where: and(
          eq(credits.clientId, clientId),
          eq(credits.status, 'active'),
        ),
      });

      // Get client info
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, clientId),
      });

      return {
        client,
        recentOrders,
        openInvoices,
        totalOwed: openInvoices.reduce((sum, inv) => sum + inv.amountDue, 0),
        availableCredit: credits.reduce((sum, c) => sum + c.remainingAmount, 0),
        credits,
      };
    }),

  getOrderHistory: vipProtectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      return db.query.orders.findMany({
        where: eq(orders.clientId, ctx.vipUser.clientId),
        with: {
          items: { with: { batch: { with: { product: true } } } },
        },
        orderBy: desc(orders.createdAt),
        limit: input.limit,
        offset: input.offset,
      });
    }),

  getInvoices: vipProtectedProcedure
    .query(async ({ ctx }) => {
      return db.query.invoices.findMany({
        where: eq(invoices.clientId, ctx.vipUser.clientId),
        orderBy: desc(invoices.createdAt),
      });
    }),
});
```

---

## Part B: Notifications System (4-5 hours)

### Task 5: Notification Infrastructure (2 hours)

```typescript
// server/services/notificationService.ts

import { db } from '../db';
import { notifications, notificationPreferences, users } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { safeInArray } from '../lib/sqlSafety';

export type NotificationType = 
  | 'order_created'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'invoice_created'
  | 'invoice_overdue'
  | 'payment_received'
  | 'inventory_low'
  | 'batch_received'
  | 'task_assigned'
  | 'task_due'
  | 'appointment_reminder'
  | 'return_requested'
  | 'credit_issued';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  link?: string;
  priority?: 'low' | 'normal' | 'high';
}

export async function createNotification(
  userId: number,
  payload: NotificationPayload
): Promise<void> {
  logger.debug('[Notifications] Creating notification', { userId, type: payload.type });

  // Check user preferences
  const prefs = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });

  // Check if user has disabled this notification type
  if (prefs?.disabledTypes?.includes(payload.type)) {
    logger.debug('[Notifications] Notification type disabled for user', { userId, type: payload.type });
    return;
  }

  await db.insert(notifications).values({
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    entityType: payload.entityType,
    entityId: payload.entityId,
    link: payload.link,
    priority: payload.priority || 'normal',
    isRead: false,
    createdAt: new Date(),
  });

  logger.info('[Notifications] Notification created', { userId, type: payload.type });
}

export async function createBulkNotifications(
  userIds: number[],
  payload: NotificationPayload
): Promise<void> {
  if (userIds.length === 0) return;

  logger.debug('[Notifications] Creating bulk notifications', { userCount: userIds.length, type: payload.type });

  // Get all user preferences
  const prefs = await db.query.notificationPreferences.findMany({
    where: safeInArray(notificationPreferences.userId, userIds),
  });

  const prefsMap = new Map(prefs.map(p => [p.userId, p]));

  // Filter out users who have disabled this type
  const eligibleUserIds = userIds.filter(userId => {
    const userPrefs = prefsMap.get(userId);
    return !userPrefs?.disabledTypes?.includes(payload.type);
  });

  if (eligibleUserIds.length === 0) return;

  await db.insert(notifications).values(
    eligibleUserIds.map(userId => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      entityType: payload.entityType,
      entityId: payload.entityId,
      link: payload.link,
      priority: payload.priority || 'normal',
      isRead: false,
      createdAt: new Date(),
    }))
  );

  logger.info('[Notifications] Bulk notifications created', { count: eligibleUserIds.length, type: payload.type });
}

export async function notifyRole(
  role: string,
  payload: NotificationPayload
): Promise<void> {
  const usersWithRole = await db.query.users.findMany({
    where: eq(users.role, role),
    columns: { id: true },
  });

  await createBulkNotifications(
    usersWithRole.map(u => u.id),
    payload
  );
}
```

### Task 6: Notification Router (1 hour)

```typescript
// server/routers/notifications.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { notifications, notificationPreferences } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().default(false),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(notifications.userId, ctx.user.id)];
      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      return db.query.notifications.findMany({
        where: and(...conditions),
        orderBy: desc(notifications.createdAt),
        limit: input.limit,
      });
    }),

  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await db.select({
        count: sql<number>`count(*)`,
      })
        .from(notifications)
        .where(and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
        ));

      return result[0]?.count || 0;
    }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.id, input.id),
          eq(notifications.userId, ctx.user.id),
        ));

      return { success: true };
    }),

  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
        ));

      return { success: true };
    }),

  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      let prefs = await db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, ctx.user.id),
      });

      if (!prefs) {
        // Create default preferences
        const [newPrefs] = await db.insert(notificationPreferences).values({
          userId: ctx.user.id,
          emailEnabled: true,
          pushEnabled: true,
          disabledTypes: [],
          createdAt: new Date(),
        }).returning();
        prefs = newPrefs;
      }

      return prefs;
    }),

  updatePreferences: protectedProcedure
    .input(z.object({
      emailEnabled: z.boolean().optional(),
      pushEnabled: z.boolean().optional(),
      disabledTypes: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.update(notificationPreferences)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, ctx.user.id));

      return { success: true };
    }),
});
```

### Task 7: Notification Triggers (1.5 hours)

```typescript
// server/services/notificationTriggers.ts

import { createNotification, notifyRole } from './notificationService';
import { logger } from '../lib/logger';

export async function onOrderCreated(order: Order): Promise<void> {
  // Notify sales team
  await notifyRole('sales', {
    type: 'order_created',
    title: 'New Order',
    message: `Order ${order.orderNumber} created for ${order.client.name}`,
    entityType: 'order',
    entityId: order.id,
    link: `/orders/${order.id}`,
  });
}

export async function onOrderShipped(order: Order): Promise<void> {
  // Notify client's VIP users
  const vipUsers = await db.query.vipUsers.findMany({
    where: eq(vipUsers.clientId, order.clientId),
  });

  for (const vipUser of vipUsers) {
    // VIP notifications would go to a separate table
    logger.info('[Notifications] Would notify VIP user about shipment', { vipUserId: vipUser.id });
  }
}

export async function onInvoiceOverdue(invoice: Invoice): Promise<void> {
  // Notify accounting
  await notifyRole('accounting', {
    type: 'invoice_overdue',
    title: 'Invoice Overdue',
    message: `Invoice ${invoice.invoiceNumber} for ${invoice.client.name} is overdue`,
    entityType: 'invoice',
    entityId: invoice.id,
    link: `/invoices/${invoice.id}`,
    priority: 'high',
  });
}

export async function onInventoryLow(batch: Batch): Promise<void> {
  await notifyRole('inventory', {
    type: 'inventory_low',
    title: 'Low Inventory Alert',
    message: `${batch.product.name} (${batch.code}) is running low: ${batch.quantity} remaining`,
    entityType: 'batch',
    entityId: batch.id,
    link: `/inventory/${batch.id}`,
    priority: 'high',
  });
}

export async function onTaskAssigned(task: Task, assigneeId: number): Promise<void> {
  await createNotification(assigneeId, {
    type: 'task_assigned',
    title: 'Task Assigned',
    message: `You have been assigned: ${task.title}`,
    entityType: 'task',
    entityId: task.id,
    link: `/tasks/${task.id}`,
  });
}

export async function onAppointmentReminder(appointment: Appointment): Promise<void> {
  await createNotification(appointment.userId, {
    type: 'appointment_reminder',
    title: 'Appointment Reminder',
    message: `Reminder: ${appointment.title} in 1 hour`,
    entityType: 'appointment',
    entityId: appointment.id,
    link: `/calendar?date=${appointment.date}`,
  });
}
```

---

## Git Workflow

```bash
git checkout -b feat/wave-6-vip-notifications

# VIP Authentication
git add server/routers/vipAuth.ts
git commit -m "feat(VIP-1): Implement VIP portal authentication"

# VIP Catalog
git add server/routers/vipCatalog.ts
git commit -m "feat(VIP-2): Implement VIP catalog browsing with client pricing"

# VIP Cart & Checkout
git add server/routers/vipCart.ts
git commit -m "feat(VIP-3): Implement VIP cart and checkout"

# VIP Account
git add server/routers/vipAccount.ts
git commit -m "feat(VIP-4): Implement VIP account dashboard"

# Notification Service
git add server/services/notificationService.ts
git commit -m "feat(NOTIF-1): Implement notification service"

# Notification Router
git add server/routers/notifications.ts
git commit -m "feat(NOTIF-2): Implement notification router"

# Notification Triggers
git add server/services/notificationTriggers.ts
git commit -m "feat(NOTIF-3): Implement notification triggers"

git push origin feat/wave-6-vip-notifications
gh pr create --title "Wave 6: VIP Portal & Notifications" --body "
## Summary
Complete VIP Portal and notification system.

## Changes
- VIP authentication and session management
- VIP catalog browsing with client-specific pricing
- VIP cart and checkout flow
- VIP account dashboard
- Notification service with preferences
- Notification triggers for key events

## Testing
- [ ] VIP login/logout works
- [ ] VIP can browse catalog
- [ ] VIP can add to cart and checkout
- [ ] VIP can view order history
- [ ] Notifications are created for events
- [ ] Notification preferences are respected
"
```

---

## Success Criteria

### VIP Portal
- [ ] VIP login works
- [ ] VIP can browse catalog
- [ ] Client-specific pricing shows
- [ ] Cart add/update/remove works
- [ ] Checkout creates order
- [ ] Order history shows
- [ ] Invoice list shows

### Notifications
- [ ] Notifications created for events
- [ ] Unread count accurate
- [ ] Mark as read works
- [ ] Preferences respected
- [ ] Role-based notifications work
