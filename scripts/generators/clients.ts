/**
 * Client generation (buyers and vendors)
 */

import { faker } from "@faker-js/faker";
import { CONFIG } from "./config.js";
import { generateCompanyName } from "./utils.js";

export interface ClientData {
  id?: number;
  teriCode: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isBuyer: boolean;
  isSeller: boolean;
  isBrand: boolean;
  isReferee?: boolean;
  isContractor?: boolean;
  tags: string[];
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
      teriCode: `WHL${String(i + 1).padStart(4, "0")}`,
      name: companyName,
      email: faker.internet.email({
        firstName: "contact",
        lastName: companyName.split(" ")[0].toLowerCase(),
        provider: "example.com",
      }),
      phone: faker.phone.number(),
      address: faker.location.streetAddress({ useFullAddress: true }),
      isBuyer: true,
      isSeller: false,
      isBrand: Math.random() < 0.1, // 10% of whales are also brands
      tags: ["wholesale", "high-volume", "cannabis"],
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
      teriCode: `REG${String(i + 1).padStart(4, "0")}`,
      name: companyName,
      email: faker.internet.email({
        firstName: "contact",
        lastName: companyName.split(" ")[0].toLowerCase(),
        provider: "example.com",
      }),
      phone: faker.phone.number(),
      address: faker.location.streetAddress({ useFullAddress: true }),
      isBuyer: true,
      isSeller: false,
      isBrand: false,
      tags: ["retail", "cannabis"],
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
    "NorCal Farms",
    "Emerald Triangle Growers",
    "Humboldt Harvest Co",
    "Mendocino Gardens",
    "Trinity Alps Cultivation",
    "Sacramento Valley Farms",
    "Central Coast Growers",
    "SoCal Premium Supply",
  ];

  for (let i = 0; i < CONFIG.totalVendors; i++) {
    const companyName = vendorNames[i];
    vendors.push({
      teriCode: `VND${String(i + 1).padStart(4, "0")}`,
      name: companyName,
      email: faker.internet.email({
        firstName: "sales",
        lastName: companyName.split(" ")[0].toLowerCase(),
        provider: "example.com",
      }),
      phone: faker.phone.number(),
      address: faker.location.streetAddress({ useFullAddress: true }),
      isBuyer: false,
      isSeller: true,
      isBrand: false,
      tags: ["vendor", "supplier", "cultivator"],
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
