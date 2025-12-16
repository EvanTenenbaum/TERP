/**
 * Debug router - for checking database state
 * REMOVE THIS IN PRODUCTION
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc.js';
import { db } from '../db.js';
import { vendors, clients, products, batches, orders, invoices, payments } from '../../drizzle/schema.js';

export const debugRouter = router({
  /**
   * Get counts of all seeded tables
   */
  getCounts: publicProcedure.query(async () => {
    try {
      const [
        vendorsList,
        clientsList,
        productsList,
        batchesList,
        ordersList,
        invoicesList,
        paymentsList,
      ] = await Promise.all([
        db.select().from(vendors),
        db.select().from(clients),
        db.select().from(products),
        db.select().from(batches),
        db.select().from(orders),
        db.select().from(invoices),
        db.select().from(payments),
      ]);

      return {
        success: true,
        counts: {
          vendors: vendorsList.length,
          clients: clientsList.length,
          products: productsList.length,
          batches: batchesList.length,
          orders: ordersList.length,
          invoices: invoicesList.length,
          payments: paymentsList.length,
          total: vendorsList.length + clientsList.length + productsList.length + 
                 batchesList.length + ordersList.length + invoicesList.length + paymentsList.length,
        },
        sampleVendor: vendorsList[0] || null,
        sampleBatch: batchesList[0] || null,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }),
});
