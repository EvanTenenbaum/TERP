// @ts-nocheck - TEMPORARY: Schema mismatch errors, needs Wave 1 fix
/**
 * WS-011: Quick Customer Creation Router
 * Enables rapid customer creation with minimal required fields
 */

import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { db } from "../db";
import { clients } from "../../drizzle/schema";
import { eq, like, desc, sql } from "drizzle-orm";

export const quickCustomerRouter = router({
  /**
   * Quick create customer with just a name
   * All other fields are optional and can be filled later
   */
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      // All optional fields
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      tier: z.enum(['STANDARD', 'PREFERRED', 'VIP', 'PLATINUM']).optional().default('STANDARD'),
      notes: z.string().optional(),
      referredBy: z.number().optional(), // Client ID who referred them
    }))
    .mutation(async ({ input, ctx }) => {
      // Generate a simple client code
      const clientCode = `C-${Date.now().toString(36).toUpperCase()}`;

      const [newClient] = await db.insert(clients).values({
        name: input.name,
        clientCode,
        email: input.email,
        phone: input.phone,
        company: input.company,
        tier: input.tier,
        notes: input.notes,
        referredByClientId: input.referredBy,
        totalOwed: '0',
        status: 'ACTIVE',
        createdBy: ctx.user.id,
        createdAt: new Date(),
      });

      return {
        clientId: newClient.insertId,
        clientCode,
        name: input.name,
        success: true,
      };
    }),

  /**
   * Search customers by name (for quick selection)
   */
  search: adminProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const results = await db
        .select({
          id: clients.id,
          name: clients.name,
          clientCode: clients.clientCode,
          company: clients.company,
          tier: clients.tier,
          totalOwed: clients.totalOwed,
        })
        .from(clients)
        .where(like(clients.name, `%${input.query}%`))
        .orderBy(clients.name)
        .limit(input.limit);

      return results.map(c => ({
        id: c.id,
        name: c.name,
        clientCode: c.clientCode,
        company: c.company,
        tier: c.tier,
        balance: parseFloat(c.totalOwed as string || '0'),
      }));
    }),

  /**
   * Get or create customer by name
   * If exact match exists, return it; otherwise create new
   */
  getOrCreate: adminProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check for exact match
      const [existing] = await db
        .select()
        .from(clients)
        .where(eq(clients.name, input.name))
        .limit(1);

      if (existing) {
        return {
          clientId: existing.id,
          clientCode: existing.clientCode,
          name: existing.name,
          isNew: false,
        };
      }

      // Create new customer
      const clientCode = `C-${Date.now().toString(36).toUpperCase()}`;
      
      const [newClient] = await db.insert(clients).values({
        name: input.name,
        clientCode,
        totalOwed: '0',
        status: 'ACTIVE',
        tier: 'STANDARD',
        createdBy: ctx.user.id,
        createdAt: new Date(),
      });

      return {
        clientId: newClient.insertId,
        clientCode,
        name: input.name,
        isNew: true,
      };
    }),

  /**
   * Get recent customers for quick selection
   */
  getRecent: adminProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const results = await db
        .select({
          id: clients.id,
          name: clients.name,
          clientCode: clients.clientCode,
          tier: clients.tier,
        })
        .from(clients)
        .where(eq(clients.status, 'ACTIVE'))
        .orderBy(desc(clients.createdAt))
        .limit(input.limit);

      return results;
    }),
});
