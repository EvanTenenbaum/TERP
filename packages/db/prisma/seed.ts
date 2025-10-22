// npx ts-node prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Vendors
  const v1 = await prisma.vendor.upsert({
    where: { vendorCode: 'ACME' },
    update: {},
    create: { vendorCode: 'ACME', companyName: 'Acme Supplies' },
  });
  const v2 = await prisma.vendor.upsert({
    where: { vendorCode: 'GLOBE' },
    update: {},
    create: { vendorCode: 'GLOBE', companyName: 'Globe Corp' },
  });

  // Customers
  const c1 = await prisma.customer.upsert({
    where: { code: 'CUST-ALPHA' },
    update: {},
    create: { code: 'CUST-ALPHA', name: 'Alpha LLC', termsDays: 30 },
  });
  const c2 = await prisma.customer.upsert({
    where: { code: 'CUST-BETA' },
    update: {},
    create: { code: 'CUST-BETA', name: 'Beta Inc', termsDays: 45 },
  });

  // Products
  const p1 = await prisma.product.upsert({
    where: { sku: 'SKU-001' },
    update: {},
    create: { sku: 'SKU-001', name: 'Widget A', defaultUnitPriceCents: 1500, abcClass: 'A' as any },
  });
  const p2 = await prisma.product.upsert({
    where: { sku: 'SKU-002' },
    update: {},
    create: { sku: 'SKU-002', name: 'Widget B', defaultUnitPriceCents: 2500, abcClass: 'B' as any },
  });
  const p3 = await prisma.product.upsert({
    where: { sku: 'SKU-003' },
    update: {},
    create: { sku: 'SKU-003', name: 'Widget C', defaultUnitPriceCents: 500, abcClass: 'C' as any },
  });

  // PriceBooks
  await prisma.priceBookEntry.createMany({
    data: [
      { productId: p1.id, scope: 'GLOBAL', unitPriceCents: 1400 },
      { productId: p2.id, scope: 'GLOBAL', unitPriceCents: 2400 },
      { productId: p1.id, scope: 'CUSTOMER', customerId: c1.id, unitPriceCents: 1300 },
    ],
    skipDuplicates: true,
  });

  // Inventory Lots
  const now = new Date();
  const lot1 = await prisma.inventoryLot.create({
    data: { productId: p1.id, onHandQty: 100, allocatedQty: 0, availableQty: 100, batchCreatedAt: now },
  });
  const lot2 = await prisma.inventoryLot.create({
    data: { productId: p2.id, onHandQty: 50, allocatedQty: 0, availableQty: 50, batchCreatedAt: new Date(now.getTime() - 86400000) },
  });
  const lot3 = await prisma.inventoryLot.create({
    data: { productId: p3.id, onHandQty: 200, allocatedQty: 0, availableQty: 200, batchCreatedAt: new Date(now.getTime() - 2*86400000) },
  });

  // Quote
  const quote = await prisma.quote.create({
    data: {
      customerId: c1.id,
      status: 'OPEN',
      items: {
        create: [
          { productId: p1.id, quantity: 2 },
          { productId: p2.id, quantity: 1 },
        ],
      },
    },
    include: { items: true },
  });

  // Invoice + Payment baseline
  const order = await prisma.order.create({
    data: { customerId: c1.id, status: 'ALLOCATED' },
  });
  const oi1 = await prisma.orderItem.create({
    data: { orderId: order.id, productId: p1.id, quantity: 3, unitPriceCents: 1300, cogsCents: 900 },
  });
  const invoice = await prisma.invoice.create({
    data: { customerId: c1.id, orderId: order.id, issuedAt: now, dueAt: new Date(now.getTime() + 30*86400000), totalCents: 3900, balanceCents: 3900, status: 'OPEN' },
  });
  await prisma.payment.create({
    data: { customerId: c1.id, method: 'ACH' as any, reference: 'SEED-001', amountCents: 2500, remainingCents: 2500, status: 'UNAPPLIED' },
  });

  // Replenishment Rule
  await prisma.replenishmentRule.create({
    data: { productId: p2.id, minQty: 20, targetQty: 80 },
  });

  console.log('Seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
