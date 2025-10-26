/**
 * Test fixtures for inventory batches
 */

import { InsertBatch } from '../../../drizzle/schema';

export const testBatches: InsertBatch[] = [
  {
    sku: 'BATCH-FIXED-001',
    productId: 1,
    vendorId: 1,
    cogsMode: 'FIXED',
    unitCogs: '10.00',
    unitCogsMin: null,
    unitCogsMax: null,
    onHandQty: '100',
    sampleQty: '10',
    status: 'LIVE',
    createdBy: 1,
  },
  {
    sku: 'BATCH-RANGE-001',
    productId: 1,
    vendorId: 1,
    cogsMode: 'RANGE',
    unitCogs: null,
    unitCogsMin: '10.00',
    unitCogsMax: '20.00',
    onHandQty: '100',
    sampleQty: '10',
    status: 'LIVE',
    createdBy: 1,
  },
  {
    sku: 'BATCH-SAMPLE-001',
    productId: 1,
    vendorId: 1,
    cogsMode: 'FIXED',
    unitCogs: '5.00',
    unitCogsMin: null,
    unitCogsMax: null,
    onHandQty: '50',
    sampleQty: '20',
    status: 'LIVE',
    createdBy: 1,
  },
];

