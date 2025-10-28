/**
 * Client generation (buyers and vendors)
 */

import { CONFIG } from './config.js';
import { generateCompanyName, generatePersonName, randomInRange } from './utils.js';

export interface ClientData {
  id?: number;
  teriCode: string;
  name: string;
  isBuyer: number;
  isSeller: number;
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
    whales.push({
      teriCode: `WHL${String(i + 1).padStart(4, '0')}`, // WHL0001, WHL0002, etc.
      name: generateCompanyName(i),
      isBuyer: 1,
      isSeller: 0,
      paymentTerms: i < 5 ? 'NET_30' : 'NET_15', // Top whales get NET_30
      creditLimit: String(randomInRange(500000, 1000000)), // $500K-$1M credit
      notes: `Whale client - ${Math.floor((CONFIG.whaleRevenuePercent / CONFIG.whaleClients) * 100)}% of revenue`,
      createdAt: new Date(2023, 11, 1 + i), // Created in Dec 2023
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
    regular.push({
      teriCode: `REG${String(i + 1).padStart(4, '0')}`, // REG0001, REG0002, etc.
      name: generateCompanyName(CONFIG.whaleClients + i),
      isBuyer: 1,
      isSeller: 0,
      paymentTerms: i % 3 === 0 ? 'NET_30' : i % 3 === 1 ? 'NET_15' : 'NET_7',
      creditLimit: String(randomInRange(50000, 200000)), // $50K-$200K credit
      notes: null,
      createdAt: new Date(2023, 11, 1 + Math.floor(i / 5)), // Staggered creation
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
    vendors.push({
      teriCode: `VND${String(i + 1).padStart(4, '0')}`, // VND0001, VND0002, etc.
      name: vendorNames[i],
      isBuyer: 0,
      isSeller: 1,
      paymentTerms: 'CONSIGNMENT', // Most vendors are consignment
      creditLimit: '0', // Vendors don't need credit
      notes: `Vendor - supplies ${Math.floor(100 / CONFIG.totalVendors)}% of inventory`,
      createdAt: new Date(2023, 10, 15 + i), // Created in Nov 2023
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

