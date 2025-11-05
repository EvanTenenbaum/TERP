/**
 * Client generation (buyers and vendors)
 */

import { faker } from '@faker-js/faker';
import { CONFIG } from './config.js';
import { generateCompanyName, randomInRange, randomChoice } from './utils.js';

export interface ClientData {
  id?: number;
  teriCode: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isBuyer: number;
  isSeller: number;
  isBrand: number;
  tags: string;
  paymentTerms: string;
  creditLimit: string;
  notes: string | null;
  createdAt: Date;
}

/**
 * Generate whale clients (10 clients, 70% of revenue)
 */
export function generateWhaleClients(): ClientData[] {
  const whales: ClientData[] = [];
  
  for (let i = 0; i < CONFIG.whaleClients; i++) {
    const companyName = generateCompanyName(i);
    whales.push({
      teriCode: `WHL${String(i + 1).padStart(4, '0')}`,
      name: companyName,
      email: faker.internet.email({ firstName: 'contact', lastName: companyName.split(' ')[0].toLowerCase(), provider: 'example.com' }),
      phone: faker.phone.number(),
      address: faker.location.streetAddress({ useFullAddress: true }),
      isBuyer: 1,
      isSeller: 0,
      isBrand: randomInRange(0, 1) < 0.1 ? 1 : 0, // 10% of whales are also brands
      tags: JSON.stringify(['wholesale', 'high-volume', 'cannabis']),
      paymentTerms: i < 5 ? 'NET_30' : 'NET_15',
      creditLimit: String(randomInRange(500000, 1000000)),
      notes: `Whale client - ${Math.floor((CONFIG.whaleRevenuePercent / CONFIG.whaleClients) * 100)}% of revenue`,
      createdAt: new Date(2023, 11, 1 + i),
    });
  }
  
  return whales;
}

/**
 * Generate regular clients (50 clients, 30% of revenue)
 */
export function generateRegularClients(): ClientData[] {
  const regular: ClientData[] = [];
  
  for (let i = 0; i < CONFIG.regularClients; i++) {
    const companyName = generateCompanyName(CONFIG.whaleClients + i);
    regular.push({
      teriCode: `REG${String(i + 1).padStart(4, '0')}`,
      name: companyName,
      email: faker.internet.email({ firstName: 'contact', lastName: companyName.split(' ')[0].toLowerCase(), provider: 'example.com' }),
      phone: faker.phone.number(),
      address: faker.location.streetAddress({ useFullAddress: true }),
      isBuyer: 1,
      isSeller: 0,
      isBrand: 0,
      tags: JSON.stringify(['retail', 'cannabis']),
      paymentTerms: i % 3 === 0 ? 'NET_30' : i % 3 === 1 ? 'NET_15' : 'NET_7',
      creditLimit: String(randomInRange(50000, 200000)),
      notes: null,
      createdAt: new Date(2023, 11, 1 + Math.floor(i / 5)),
    });
  }
  
  return regular;
}

/**
 * Generate vendor clients (8 vendors for consignment intake)
 */
export function generateVendorClients(): ClientData[] {
  const vendors: ClientData[] = [];
  
  const vendorNames = [
    'NorCal Farms',
    'Emerald Triangle Growers',
    'Humboldt Harvest Co',
    'Mendocino Gardens',
    'Trinity Alps Cultivation',
    'Sacramento Valley Farms',
    'Central Coast Growers',
    'SoCal Premium Supply',
  ];
  
  for (let i = 0; i < CONFIG.totalVendors; i++) {
    const companyName = vendorNames[i];
    vendors.push({
      teriCode: `VND${String(i + 1).padStart(4, '0')}`,
      name: companyName,
      email: faker.internet.email({ firstName: 'sales', lastName: companyName.split(' ')[0].toLowerCase(), provider: 'example.com' }),
      phone: faker.phone.number(),
      address: faker.location.streetAddress({ useFullAddress: true }),
      isBuyer: 0,
      isSeller: 1,
      isBrand: 0,
      tags: JSON.stringify(['vendor', 'supplier', 'cultivator']),
      paymentTerms: 'CONSIGNMENT',
      creditLimit: '0',
      notes: `Vendor - supplies ${Math.floor(100 / CONFIG.totalVendors)}% of inventory`,
      createdAt: new Date(2023, 10, 15 + i),
    });
  }
  
  return vendors;
}

/**
 * Generate all clients (buyers + vendors)
 */
export function generateAllClients(): ClientData[] {
  const whales = generateWhaleClients();
  const regular = generateRegularClients();
  const vendors = generateVendorClients();
  
  return [...whales, ...regular, ...vendors];
}
