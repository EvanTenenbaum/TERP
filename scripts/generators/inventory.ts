/**
 * Inventory generation (lots and batches with consignment tracking)
 */

import { faker } from '@faker-js/faker';
import { CONFIG } from './config.js';
import { randomInRange, addVariance } from './utils.js';

export interface LotData {
  id?: number;
  code: string;
  vendorId: number;
  date: Date;
  notes: string | null;
  createdAt: Date;
}

export interface BatchData {
  id?: number;
  code: string;
  sku: string;
  productId: number;
  lotId: number;
  status: string;
  grade: string | null;
  isSample: number;
  sampleOnly: number;
  sampleAvailable: number;
  cogsMode: "FIXED" | "RANGE";
  unitCogs: string;
  unitCogsMin: string | null;
  unitCogsMax: string | null;
  paymentTerms: "COD" | "NET_7" | "NET_15" | "NET_30" | "CONSIGNMENT" | "PARTIAL";
  amountPaid: string;
  metadata: string | null;
  onHandQty: string;
  sampleQty: string;
  reservedQty: string;
  quarantineQty: string;
  holdQty: string;
  defectiveQty: string;
  publishEcom: number;
  publishB2b: number;
  createdAt: Date;
}

/**
 * Generate lots (receiving batches)
 */
export function generateLots(vendorIds: number[]): LotData[] {
  const lotsData: LotData[] = [];
  const totalLots = CONFIG.totalMonths * CONFIG.lotsPerMonth;
  const startDate = CONFIG.startDate;
  
  for (let i = 0; i < totalLots; i++) {
    const daysOffset = Math.floor((i / totalLots) * (CONFIG.totalMonths * 30));
    const lotDate = new Date(startDate);
    lotDate.setDate(lotDate.getDate() + daysOffset);
    
    // Rotate through vendors for each lot
    const vendorId = vendorIds[i % vendorIds.length];
    
    lotsData.push({
      code: `LOT-${String(i + 1).padStart(5, '0')}`,
      vendorId,
      date: lotDate,
      notes: faker.lorem.sentence(),
      createdAt: lotDate,
    });
  }
  
  return lotsData;
}

/**
 * Generate inventory batches with consignment tracking
 */
export function generateBatches(
  productIds: number[],
  lotIds: number[],
  vendorIds: number[]
): BatchData[] {
  const batchesData: BatchData[] = [];
  const flowerProducts = productIds.slice(0, 450); // First 450 are flower
  const nonFlowerProducts = productIds.slice(450); // Rest are non-flower
  
  // Generate batches for flower products (90% of inventory)
  const flowerBatchCount = Math.floor(lotIds.length * 0.90);
  for (let i = 0; i < flowerBatchCount; i++) {
    const productId = flowerProducts[i % flowerProducts.length];
    const lotId = lotIds[i % lotIds.length];
    const vendorId = vendorIds[i % vendorIds.length];
    
    // 90% consignment, 10% COD
    const isConsignment = Math.random() < CONFIG.intakeConsignmentRate;
    const paymentTerms = isConsignment ? 'CONSIGNMENT' : 'COD';
    
    // Determine grow type from product index to set COGS
    const productIndex = productId - 1;
    const isIndoor = productIndex % 9 < 3; // First 3 of each 9 (AAA, AA, A)
    const isGreenhouse = productIndex % 9 >= 3 && productIndex % 9 < 6;
    const isOutdoor = productIndex % 9 >= 6;
    
    let unitCogs = CONFIG.outdoorPrice;
    if (isIndoor) unitCogs = CONFIG.indoorPrice;
    else if (isGreenhouse) unitCogs = CONFIG.greenhousePrice;
    
    // Add variance to COGS (±10%)
    unitCogs = addVariance(unitCogs, 0.10);
    
    // Generate realistic quantities (10-500 lbs per batch)
    const onHandQty = randomInRange(10, 500);
    
    batchesData.push({
      code: `BATCH-${String(i + 1).padStart(6, '0')}`,
      sku: `SKU-${String(productId).padStart(4, '0')}-${String(lotId).padStart(4, '0')}`,
      productId,
      lotId,
      status: 'LIVE',
      grade: ['AAA', 'AA', 'A'][productIndex % 3],
      isSample: 0,
      sampleOnly: 0,
      sampleAvailable: 1,
      cogsMode: 'FIXED',
      unitCogs: unitCogs.toFixed(2),
      unitCogsMin: null,
      unitCogsMax: null,
      paymentTerms,
      amountPaid: isConsignment ? '0' : (unitCogs * onHandQty).toFixed(2),
      metadata: null,
      onHandQty: String(onHandQty),
      sampleQty: '0',
      reservedQty: '0',
      quarantineQty: '0',
      holdQty: '0',
      defectiveQty: '0',
      publishEcom: 0,
      publishB2b: 1,
      createdAt: new Date(CONFIG.startDate.getTime() + (i / flowerBatchCount) * (CONFIG.endDate.getTime() - CONFIG.startDate.getTime())),
    });
  }
  
  // Generate batches for non-flower products (10% of inventory)
  const nonFlowerBatchCount = lotIds.length - flowerBatchCount;
  for (let i = 0; i < nonFlowerBatchCount; i++) {
    const productId = nonFlowerProducts[i % nonFlowerProducts.length];
    const lotId = lotIds[(flowerBatchCount + i) % lotIds.length];
    const vendorId = vendorIds[i % vendorIds.length];
    
    const isConsignment = Math.random() < CONFIG.intakeConsignmentRate;
    const paymentTerms = isConsignment ? 'CONSIGNMENT' : 'COD';
    
    // Non-flower products have different pricing
    const unitCogs = addVariance(50, 0.20); // $50 average per unit
    const onHandQty = randomInRange(50, 1000); // More units for non-flower
    
    batchesData.push({
      code: `BATCH-${String(flowerBatchCount + i + 1).padStart(6, '0')}`,
      sku: `SKU-${String(productId).padStart(4, '0')}-${String(lotId).padStart(4, '0')}`,
      productId,
      lotId,
      status: 'LIVE',
      grade: null,
      isSample: 0,
      sampleOnly: 0,
      sampleAvailable: 1,
      cogsMode: 'FIXED',
      unitCogs: unitCogs.toFixed(2),
      unitCogsMin: null,
      unitCogsMax: null,
      paymentTerms,
      amountPaid: isConsignment ? '0' : (unitCogs * onHandQty).toFixed(2),
      metadata: null,
      onHandQty: String(onHandQty),
      sampleQty: '0',
      reservedQty: '0',
      quarantineQty: '0',
      holdQty: '0',
      defectiveQty: '0',
      publishEcom: 0,
      publishB2b: 1,
      createdAt: new Date(CONFIG.startDate.getTime() + (i / nonFlowerBatchCount) * (CONFIG.endDate.getTime() - CONFIG.startDate.getTime())),
    });
  }
  
  return batchesData;
}

