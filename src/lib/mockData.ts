// Mock data for development without database
export const MOCK_ENABLED = !process.env.DATABASE_URL;

export const mockQuotes = [
  {
    id: '1',
    quoteNumber: 'Q-1001',
    customerId: '1',
    customer: { id: '1', name: 'Acme Corp', code: 'ACME' },
    status: 'SENT',
    total: 15000,
    createdAt: new Date('2024-01-15'),
    expiresAt: new Date('2024-02-15'),
    items: [
      { id: '1', productId: '1', product: { name: 'Widget A' }, quantity: 10, unitPrice: 1500 }
    ]
  },
  {
    id: '2',
    quoteNumber: 'Q-1002',
    customerId: '2',
    customer: { id: '2', name: 'TechCo Inc', code: 'TECH' },
    status: 'DRAFT',
    total: 25000,
    createdAt: new Date('2024-01-20'),
    expiresAt: new Date('2024-02-20'),
    items: []
  },
  {
    id: '3',
    quoteNumber: 'Q-1003',
    customerId: '3',
    customer: { id: '3', name: 'Global Systems', code: 'GLOB' },
    status: 'ACCEPTED',
    total: 50000,
    createdAt: new Date('2024-01-25'),
    expiresAt: new Date('2024-02-25'),
    items: []
  }
];

export const mockCustomers = [
  { id: '1', name: 'Acme Corp', code: 'ACME', email: 'contact@acme.com' },
  { id: '2', name: 'TechCo Inc', code: 'TECH', email: 'info@techco.com' },
  { id: '3', name: 'Global Systems', code: 'GLOB', email: 'sales@global.com' }
];

export const mockProducts = [
  { id: '1', sku: 'WID-001', name: 'Widget A', price: 1500, stock: 100 },
  { id: '2', sku: 'WID-002', name: 'Widget B', price: 2500, stock: 50 },
  { id: '3', sku: 'GAD-001', name: 'Gadget X', price: 5000, stock: 25 }
];

export const mockInventory = [
  { id: '1', productId: '1', product: mockProducts[0], quantity: 100, location: 'Warehouse A' },
  { id: '2', productId: '2', product: mockProducts[1], quantity: 50, location: 'Warehouse A' },
  { id: '3', productId: '3', product: mockProducts[2], quantity: 25, location: 'Warehouse B' }
];

export const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV-1001',
    customerId: '1',
    customer: mockCustomers[0],
    total: 15000,
    paid: 15000,
    status: 'PAID',
    dueDate: new Date('2024-02-01'),
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    invoiceNumber: 'INV-1002',
    customerId: '2',
    customer: mockCustomers[1],
    total: 25000,
    paid: 0,
    status: 'PENDING',
    dueDate: new Date('2024-03-01'),
    createdAt: new Date('2024-01-20')
  }
];

export const mockPayments = [
  {
    id: '1',
    invoiceId: '1',
    amount: 15000,
    method: 'WIRE',
    status: 'COMPLETED',
    createdAt: new Date('2024-01-30')
  }
];

export const mockAnalytics = {
  revenue: {
    total: 90000,
    thisMonth: 40000,
    lastMonth: 50000,
    growth: -20
  },
  quotes: {
    total: 15,
    sent: 8,
    accepted: 5,
    rejected: 2
  },
  inventory: {
    totalValue: 387500,
    lowStock: 3,
    outOfStock: 0
  }
};

