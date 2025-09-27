const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Ensure System Status singleton exists
  await prisma.systemStatus.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton', postingLocked: false } });

  // Create Users
  console.log('Creating users...');
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@erpv2.com',
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      email: 'sales@erpv2.com',
      name: 'Sales Manager',
      role: 'SALES',
    },
  });

  const accountingUser = await prisma.user.create({
    data: {
      email: 'accounting@erpv2.com',
      name: 'Accounting Manager',
      role: 'ACCOUNTING',
    },
  });

  // Create Vendors
  console.log('Creating vendors...');
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        vendorCode: 'VND001',
        companyName: 'Premium Hemp Suppliers LLC',
        contactInfo: {
          email: 'orders@premiumhemp.com',
          phone: '555-0101',
          address: '123 Industrial Way, Denver, CO 80202'
        },
      },
    }),
    prisma.vendor.create({
      data: {
        vendorCode: 'VND002',
        companyName: 'Mountain View Botanicals',
        contactInfo: {
          email: 'sales@mountainview.com',
          phone: '555-0102',
          address: '456 Mountain Rd, Boulder, CO 80301'
        },
      },
    }),
    prisma.vendor.create({
      data: {
        vendorCode: 'VND003',
        companyName: 'Organic Harvest Co',
        contactInfo: {
          email: 'info@organicharvest.com',
          phone: '555-0103',
          address: '789 Farm Lane, Fort Collins, CO 80521'
        },
      },
    }),
  ]);

  // Link Vendors to Parties
  console.log('Linking vendors to parties...');
  for (const v of vendors) {
    const party = await prisma.party.create({ data: { name: v.companyName, isVendor: true, isActive: true, contactInfo: v.contactInfo || {} } });
    await prisma.vendor.update({ where: { id: v.id }, data: { partyId: party.id } });
  }

  // Create Customers
  console.log('Creating customers...');
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        companyName: 'Green Valley Dispensary',
        contactInfo: {
          email: 'purchasing@greenvalley.com',
          phone: '555-0201',
          address: '321 Main St, Denver, CO 80202'
        },
        creditLimit: 5000000, // $50,000 in cents
        paymentTerms: 'Net 30',
      },
    }),
    prisma.customer.create({
      data: {
        companyName: 'Rocky Mountain Wellness',
        contactInfo: {
          email: 'orders@rmwellness.com',
          phone: '555-0202',
          address: '654 Health Ave, Boulder, CO 80301'
        },
        creditLimit: 2500000, // $25,000 in cents
        paymentTerms: 'Net 15',
      },
    }),
    prisma.customer.create({
      data: {
        companyName: 'Mile High Therapeutics',
        contactInfo: {
          email: 'buyer@milehigh.com',
          phone: '555-0203',
          address: '987 Therapy Blvd, Colorado Springs, CO 80903'
        },
        creditLimit: 7500000, // $75,000 in cents
        paymentTerms: 'Net 30',
      },
    }),
  ]);

  // Link Customers to Parties
  console.log('Linking customers to parties...');
  for (const c of customers) {
    const party = await prisma.party.create({ data: { name: c.companyName, isCustomer: true, isActive: true, contactInfo: c.contactInfo || {} } });
    await prisma.customer.update({ where: { id: c.id }, data: { partyId: party.id } });
  }

  // Create Products
  console.log('Creating products...');
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Premium Indoor Flower - OG Kush',
        sku: 'PIF-OGK-001',
        category: 'Indoor Flower',
        unit: 'pound',
        location: 'Vault A',
        defaultPrice: 120000, // $1,200 per pound in cents
      },
    }),
    prisma.product.create({
      data: {
        name: 'Outdoor Flower - Blue Dream',
        sku: 'OF-BD-002',
        category: 'Outdoor Flower',
        unit: 'pound',
        location: 'Vault B',
        defaultPrice: 80000, // $800 per pound in cents
      },
    }),
    prisma.product.create({
      data: {
        name: 'Light Dep - Purple Haze',
        sku: 'LD-PH-003',
        category: 'Light Dep',
        unit: 'pound',
        location: 'Vault A',
        defaultPrice: 100000, // $1,000 per pound in cents
      },
    }),
    prisma.product.create({
      data: {
        name: 'CBD Isolate Powder',
        sku: 'CBD-ISO-004',
        category: 'Concentrate',
        unit: 'kg',
        location: 'Lab Storage',
        defaultPrice: 500000, // $5,000 per kg in cents
      },
    }),
    prisma.product.create({
      data: {
        name: 'Full Spectrum CBD Oil',
        sku: 'CBD-FS-005',
        category: 'Concentrate',
        unit: 'liter',
        location: 'Lab Storage',
        defaultPrice: 300000, // $3,000 per liter in cents
      },
    }),
  ]);

  // Create Batches with realistic dates
  console.log('Creating batches...');
  const batches = [];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const vendor = vendors[i % vendors.length];
    
    const batch = await prisma.batch.create({
      data: {
        productId: product.id,
        vendorId: vendor.id,
        lotNumber: `LOT-${vendor.vendorCode}-${String(i + 1).padStart(3, '0')}`,
        receivedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        expirationDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year from now
        quantityReceived: Math.floor(Math.random() * 100) + 50, // 50-150 units
        quantityAvailable: Math.floor(Math.random() * 80) + 20, // 20-100 units available
      },
    });
    batches.push(batch);
  }

  // Create BatchCosts
  console.log('Creating batch costs...');
  for (const batch of batches) {
    await prisma.batchCost.create({
      data: {
        batchId: batch.id,
        effectiveFrom: batch.receivedDate,
        unitCost: Math.floor(Math.random() * 50000) + 10000, // $100-$600 per unit in cents
      },
    });
  }

  // Create InventoryLots
  console.log('Creating inventory lots...');
  for (const batch of batches) {
    const quantityAllocated = Math.floor(batch.quantityAvailable * 0.3); // 30% allocated
    await prisma.inventoryLot.create({
      data: {
        batchId: batch.id,
        quantityOnHand: batch.quantityAvailable + quantityAllocated,
        quantityAllocated: quantityAllocated,
        quantityAvailable: batch.quantityAvailable,
        lastMovementDate: new Date(),
      },
    });
  }

  // Create PriceBooks
  console.log('Creating price books...');
  const globalPriceBook = await prisma.priceBook.create({
    data: {
      name: 'Global Pricing',
      type: 'GLOBAL',
      effectiveDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      isActive: true,
    },
  });

  const wholesalePriceBook = await prisma.priceBook.create({
    data: {
      name: 'Wholesale Pricing',
      type: 'ROLE',
      roleId: 'wholesale',
      effectiveDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  const vipCustomerPriceBook = await prisma.priceBook.create({
    data: {
      name: 'VIP Customer Pricing',
      type: 'CUSTOMER',
      customerId: customers[2].id, // Mile High Therapeutics
      effectiveDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  // Create PriceBook Entries
  console.log('Creating price book entries...');
  for (const product of products) {
    // Global pricing (10% markup from default)
    await prisma.priceBookEntry.create({
      data: {
        priceBookId: globalPriceBook.id,
        productId: product.id,
        unitPrice: Math.floor(product.defaultPrice * 1.1),
        effectiveDate: globalPriceBook.effectiveDate,
      },
    });

    // Wholesale pricing (5% discount from default)
    await prisma.priceBookEntry.create({
      data: {
        priceBookId: wholesalePriceBook.id,
        productId: product.id,
        unitPrice: Math.floor(product.defaultPrice * 0.95),
        effectiveDate: wholesalePriceBook.effectiveDate,
      },
    });

    // VIP customer pricing (15% discount from default)
    await prisma.priceBookEntry.create({
      data: {
        priceBookId: vipCustomerPriceBook.id,
        productId: product.id,
        unitPrice: Math.floor(product.defaultPrice * 0.85),
        effectiveDate: vipCustomerPriceBook.effectiveDate,
      },
    });
  }

  // Create Sales Quotes
  console.log('Creating sales quotes...');
  const salesQuotes = [];
  for (let i = 0; i < 3; i++) {
    const customer = customers[i];
    const quote = await prisma.salesQuote.create({
      data: {
        customerId: customer.id,
        quoteNumber: `QT-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
        quoteDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last week
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: i === 0 ? 'SENT' : i === 1 ? 'ACCEPTED' : 'DRAFT',
        shareToken: `token_${Math.random().toString(36).substring(2, 15)}`,
        totalAmount: 0, // Will be calculated after items
      },
    });
    salesQuotes.push(quote);
  }

  // Create Sales Quote Items
  console.log('Creating sales quote items...');
  for (let i = 0; i < salesQuotes.length; i++) {
    const quote = salesQuotes[i];
    let totalAmount = 0;
    
    // Add 2-3 random products to each quote
    const numItems = Math.floor(Math.random() * 2) + 2;
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 10) + 1;
      const unitPrice = Math.floor(product.defaultPrice * (0.9 + Math.random() * 0.2)); // ±10% variation
      const lineTotal = quantity * unitPrice;
      totalAmount += lineTotal;

      await prisma.salesQuoteItem.create({
        data: {
          quoteId: quote.id,
          productId: product.id,
          quantity: quantity,
          unitPrice: unitPrice,
          lineTotal: lineTotal,
        },
      });
    }

    // Update quote total
    await prisma.salesQuote.update({
      where: { id: quote.id },
      data: { totalAmount: totalAmount },
    });
  }

  // Create Orders (convert some quotes to orders)
  console.log('Creating orders...');
  const orders = [];
  for (let i = 0; i < 2; i++) { // Convert first 2 quotes to orders
    const quote = salesQuotes[i];
    const order = await prisma.order.create({
      data: {
        customerId: quote.customerId,
        orderDate: new Date(quote.quoteDate.getTime() + 24 * 60 * 60 * 1000), // Day after quote
        allocationDate: new Date(),
        status: i === 0 ? 'ALLOCATED' : 'CONFIRMED',
        totalAmount: quote.totalAmount,
      },
    });
    orders.push(order);
  }

  // Create Order Items
  console.log('Creating order items...');
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const quote = salesQuotes[i];
    
    // Get quote items and create corresponding order items
    const quoteItems = await prisma.salesQuoteItem.findMany({
      where: { quoteId: quote.id },
    });

    for (const quoteItem of quoteItems) {
      // Find a suitable batch for allocation
      const availableBatch = batches.find(b => 
        b.productId === quoteItem.productId && b.quantityAvailable >= quoteItem.quantity
      );

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: quoteItem.productId,
          batchId: availableBatch?.id,
          quantity: quoteItem.quantity,
          unitPrice: quoteItem.unitPrice,
          allocationDate: order.allocationDate,
        },
      });
    }
  }

  // Create Accounts Receivable
  console.log('Creating accounts receivable...');
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    await prisma.accountsReceivable.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
        invoiceDate: new Date(order.orderDate.getTime() + 24 * 60 * 60 * 1000),
        dueDate: new Date(order.orderDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        amount: order.totalAmount,
        balanceRemaining: Math.floor(order.totalAmount * (0.5 + Math.random() * 0.5)), // 50-100% remaining
      },
    });
  }

  // Create Payments
  console.log('Creating payments...');
  const payments = [];
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const payment = await prisma.payment.create({
      data: {
        customerId: customer.id,
        paymentDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000), // Within last 15 days
        amount: Math.floor(Math.random() * 100000) + 50000, // $500-$1500
        paymentMethod: ['Check', 'Wire Transfer', 'ACH'][Math.floor(Math.random() * 3)],
        referenceNumber: `PAY-${String(i + 1).padStart(6, '0')}`,
      },
    });
    payments.push(payment);
  }

  // Create Payment Applications (FIFO)
  console.log('Creating payment applications...');
  for (const payment of payments) {
    const arRecords = await prisma.accountsReceivable.findMany({
      where: { 
        customerId: payment.customerId,
        balanceRemaining: { gt: 0 }
      },
      orderBy: { invoiceDate: 'asc' }, // FIFO
    });

    let remainingPayment = payment.amount;
    for (const ar of arRecords) {
      if (remainingPayment <= 0) break;
      
      const applicationAmount = Math.min(remainingPayment, ar.balanceRemaining);
      await prisma.paymentApplication.create({
        data: {
          paymentId: payment.id,
          arId: ar.id,
          appliedAmount: applicationAmount,
          applicationDate: payment.paymentDate,
        },
      });

      // Update AR balance
      await prisma.accountsReceivable.update({
        where: { id: ar.id },
        data: { balanceRemaining: ar.balanceRemaining - applicationAmount },
      });

      remainingPayment -= applicationAmount;
    }
  }

  // Create Accounts Payable
  console.log('Creating accounts payable...');
  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    await prisma.accountsPayable.create({
      data: {
        vendorId: vendor.id,
        invoiceNumber: `${vendor.vendorCode}-INV-${String(i + 1).padStart(3, '0')}`,
        invoiceDate: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        amount: Math.floor(Math.random() * 200000) + 100000, // $1000-$3000
        balanceRemaining: Math.floor(Math.random() * 150000) + 50000, // $500-$2000
      },
    });
  }

  // Create CRM Notes
  console.log('Creating CRM notes...');
  for (let i = 0; i < customers.length * 2; i++) {
    const customer = customers[i % customers.length];
    await prisma.crmNote.create({
      data: {
        customerId: customer.id,
        noteDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        noteType: ['Call', 'Email', 'Meeting', 'Follow-up'][Math.floor(Math.random() * 4)],
        content: `Sample CRM note for ${customer.companyName}. Discussed product requirements and pricing options.`,
        createdBy: salesUser.id,
      },
    });
  }

  // Create Sample Transactions
  console.log('Creating sample transactions...');
  for (let i = 0; i < 5; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const batch = batches.find(b => b.productId === product.id);
    
    await prisma.sampleTransaction.create({
      data: {
        productId: product.id,
        batchId: batch?.id,
        customerId: customer.id,
        transactionType: 'CLIENT_OUT',
        quantity: Math.floor(Math.random() * 5) + 1,
        unitCostSnapshot: Math.floor(Math.random() * 10000) + 5000, // $50-$150
        transactionDate: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
        notes: `Sample sent to ${customer.companyName} for evaluation`,
      },
    });
  }

  // Create Debt Adjustments
  console.log('Creating debt adjustments...');
  for (let i = 0; i < 2; i++) {
    const customer = customers[i];
    await prisma.debtAdjustment.create({
      data: {
        customerId: customer.id,
        adjustmentDate: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
        amount: (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 10000 + 5000), // ±$50-$150
        notes: `Adjustment for ${customer.companyName} - shipping discrepancy resolution`,
        createdBy: accountingUser.id,
      },
    });
  }

  console.log('✅ Database seed completed successfully!');
  console.log(`Created:
  - ${await prisma.user.count()} users
  - ${await prisma.vendor.count()} vendors  
  - ${await prisma.customer.count()} customers
  - ${await prisma.product.count()} products
  - ${await prisma.batch.count()} batches
  - ${await prisma.order.count()} orders
  - ${await prisma.salesQuote.count()} sales quotes
  - ${await prisma.payment.count()} payments
  - ${await prisma.crmNote.count()} CRM notes`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
